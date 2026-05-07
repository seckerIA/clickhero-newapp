// Edge Function: creative-specialist (Sprint C1)
// Spec: .kiro/specs/multi-agent-specialists/
//
// Sub-agente especializado em criativos AI. Invocado pelo orchestrator
// (ai-chat) via tool `delegate_to_creative`. Faz LLM call proprio com prompt
// focado em fluxo consultivo: pergunta oferta + formato + count antes de
// gerar imagem se intencao for vaga.
//
// Tools acessiveis: generate/iterate/vary/adapt/compare creative + search_knowledge
// (puxar oferta/depoimentos do briefing).
//
// Logs em agent_runs com agent_name='creative-specialist' + parent_run_id.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4.79.1';
import { getCorsHeaders } from '../_shared/cors.ts';
import { CHAT_TOOLS } from '../_shared/tools.ts';
import {
  invokeCreativeGenerate,
  invokeCreativeIterate,
  invokeCreativeAdapt,
} from '../_shared/creative-tool-handlers.ts';
import { compareCreatives, searchKnowledge } from '../_shared/data-fetchers.ts';

// 2026-05-04: movido pra gpt-4o-mini. Specialist compartilhava bucket de 30k TPM
// com ai-chat (orchestrator) e estourava 429 quando user pedia criativo durante
// conversa ja em andamento. Tool calling do specialist e estruturado/simples
// (generate/iterate/vary/adapt/compare) — mini lida bem.
const MODEL = 'gpt-4o-mini';
const COST_PER_1M_INPUT = 0.15;
const COST_PER_1M_OUTPUT = 0.60;

const SPECIALIST_PROMPT = `Voce e o Creative Specialist do ClickHero — sub-agente especializado em criar e
manipular criativos visuais (imagens) de anuncio Meta Ads usando IA.

## SUA RESPONSABILIDADE

Receber pedidos de geracao/edicao de criativos do orchestrator e responder com:
- Fluxo consultivo se pedido for vago: **uma pergunta por mensagem** (varios turnos se precisar)
- Geracao real via tools quando tiver info suficiente
- Resposta em markdown pronta pro orchestrator polir e mandar pro user

## FLUXO CONSULTIVO (OBRIGATORIO se pedido for vago)

## REGRA DE OURO PRA LEIGO (default agressivo, evita friction)

Se o orchestrator passou pergunta com OFERTA clara vinda do usuario ou ja
confirmada por ele (ex: "criar criativo pra pizza grande R$30 SP", "sim, esse
produto mesmo"), CHAME generate_creative DIRETO com defaults sensatos:
- format: "feed_1x1" (quadrado universal — funciona feed e parte do story)
- count: 1 (1 opcao basta; usuario pede mais se quiser)
- model: "auto"

NAO pergunte formato/quantidade pra leigo. Feed quadrado e 1 imagem cobrem 90%
dos casos SMB. Se o usuario quiser variar, ele pede ("faz 2", "tenta vertical").

Se a OFERTA estiver vaga ("cria um criativo" sem mais nada e sem briefing
configurado), ai sim pergunte UMA coisa: "qual a oferta/produto?". UMA pergunta
e so. Apos a resposta, ja chame generate_creative.

Se a oferta clara veio apenas do briefing/contexto da empresa, NAO gere ainda.
Confirme em uma pergunta: "Pelo que ta cadastrado aqui, voce quer anunciar
<produto/oferta X>. E esse mesmo?". Gere so depois da confirmacao.

## TOOLS DISPONIVEIS

- **generate_creative**: gera 1-4 imagens novas (precisa: concept, format, count)
- **iterate_creative**: edita imagem existente (precisa: parent_creative_id, instruction)
- **vary_creative**: 3 artes novas COM CONCEITO visual/mensagem bem diferente um do outro
  (mesmo produto/oferta da empresa — nao repetir apenas pequenas mudanca de cor/crop).
- **adapt_creative**: muda formato (ex: feed -> story)
- **compare_creatives**: analisa 2+ criativos lado a lado
- **search_knowledge**: busca depoimentos/ofertas do briefing do cliente
  (use quando precisar de info real do negocio)

## REGRA DURA: VALORES MONETARIOS NO CRIATIVO

NUNCA inclua preco, valor em R$, "por apenas X", "a partir de Y", "de R$X por
R$Y", desconto em reais, parcelamento ou qualquer numero monetario no concept,
copy ou texto da imagem do criativo — A NAO SER que o usuario tenha pedido
explicitamente nesta conversa ("coloca R$30 na arte", "destaca o preco de 99").

Vale mesmo se a oferta cadastrada no briefing tiver preco. O preco fica pra
landing/whatsapp/legenda do post — a arte vende o BENEFICIO, nao o numero.
Quando montar o concept passado pra generate_creative, REVISE e remova qualquer
mencao a valor antes de chamar a tool.

Se ja gerou um criativo com valor e o usuario reclamar ("nao quero que fale de
valores", "tira o preco", "sem R$"), chame iterate_creative com instruction
explicita pra remover o valor. NAO responda com mensagem de erro tecnica.

## FORMATOS (somente imagem estatica)

- feed_1x1 (quadrado, timeline)
- story_9x16 (vertical 9:16, stories)
- reels_4x5 (4:5 vertical — uso em Reels/feed; ainda e IMAGEM, nao arquivo de video)

## MODELOS

- nano_banana (rapido, barato — default pra plano free)
- gpt_image (alta qualidade — exige plano pro+)
- auto (deixa sistema escolher)

## DIRETRIZES DE RESPOSTA

- Markdown CURTO (max 200 palavras)
- Linguagem simples (usuario leigo) — sem jargao tipo "CTR", "ROAS"
- Quando gerar imagem com sucesso, retorne 1 frase + tag <creative-gallery
  ids="..."/> (ja vem da tool) + 1 frase de proximo passo (aprovar? iterar?)
- Quando der erro (quota, briefing incompleto, timeout), retorne a mensagem de
  erro LITERAL — orchestrator vai polir
- NUNCA invente nome de campanha/oferta — use search_knowledge se precisar
- NAO use Black Friday / Cyber Monday como exemplo espontaneo de conceito ou copy
  se o usuario nao pediu — prefira exemplos neutros SMB (servico local, produto,
  temporada generica).

Sempre em portugues brasileiro.`;

const SPECIALIST_TOOL_NAMES = new Set([
  'generate_creative',
  'iterate_creative',
  'vary_creative',
  'adapt_creative',
  'compare_creatives',
  'search_knowledge',
]);
const SPECIALIST_TOOLS = CHAT_TOOLS.filter((t) => SPECIALIST_TOOL_NAMES.has(t.function.name));

interface RequestBody {
  question: string;
  context?: string;
  parent_run_id?: string;
  conversation_id?: string;
  company_id: string;
  /** authHeader do user — necessario pra invocar creative-generate / creative-iterate */
  user_auth_header?: string;
}

function calcCost(promptTokens: number, completionTokens: number): number {
  return Math.round(
    ((promptTokens * COST_PER_1M_INPUT + completionTokens * COST_PER_1M_OUTPUT) / 1_000_000) * 1_000_000,
  ) / 1_000_000;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const reqId = crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();
  console.log(`[creative-specialist:${reqId}] received ${req.method}`);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!authHeader.includes(serviceKey)) {
      console.error(`[creative-specialist:${reqId}] auth rejected (no service key match)`);
      return jsonResponse(401, { ok: false, error: 'Internal endpoint — service role only' }, cors);
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { ok: false, error: 'Invalid JSON' }, cors);
    }

    if (!body.question || !body.company_id) {
      return jsonResponse(400, { ok: false, error: 'question and company_id required' }, cors);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') ?? '' });

    // ===== AGENT RUN TELEMETRY =====
    const runStart = Date.now();
    let runId: string | null = null;
    try {
      const { data: runRow } = await supabaseAdmin
        .from('agent_runs')
        .insert({
          company_id: body.company_id,
          agent_name: 'creative-specialist',
          conversation_id: body.conversation_id ?? null,
          status: 'running',
          model: MODEL,
          started_at: new Date(runStart).toISOString(),
          metadata: body.parent_run_id ? { parent_run_id: body.parent_run_id } : {},
        })
        .select('id')
        .single();
      runId = runRow?.id ?? null;
    } catch (telErr) {
      console.warn('[creative-specialist] agent_run insert failed:', telErr);
    }

    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    const toolsUsed: string[] = [];

    try {
      const userMessage = body.context
        ? `Contexto fornecido pelo orchestrator:\n${body.context}\n\nPedido do user:\n${body.question}`
        : body.question;

      const messages: Array<{
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string | null;
        tool_call_id?: string;
        tool_calls?: unknown[];
      }> = [
        { role: 'system', content: SPECIALIST_PROMPT },
        { role: 'user', content: userMessage },
      ];

      let finalAnswer = '';
      // Ate 3 rounds de tool call (suficiente: search_knowledge + generate_creative
      // + eventual iterate/compare)
      for (let round = 0; round < 4; round++) {
        console.log(`[creative-specialist:${reqId}] round ${round} -> openai (msgs=${messages.length})`);
        const response = await openai.chat.completions.create({
          model: MODEL,
          // deno-lint-ignore no-explicit-any
          messages: messages as any,
          tools: SPECIALIST_TOOLS,
          temperature: 0.4,
          max_tokens: 1500,
        });

        const usage = response.usage;
        if (usage) {
          promptTokens += usage.prompt_tokens ?? 0;
          completionTokens += usage.completion_tokens ?? 0;
          totalTokens += usage.total_tokens ?? 0;
        }

        const choice = response.choices[0];
        if (!choice) break;

        const msg = choice.message;
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          messages.push({
            role: 'assistant',
            content: msg.content ?? null,
            tool_calls: msg.tool_calls as unknown[],
          });

          for (const tc of msg.tool_calls) {
            // deno-lint-ignore no-explicit-any
            const fn = (tc as any).function;
            if (!fn?.name) continue;
            toolsUsed.push(fn.name);
            let args: Record<string, unknown> = {};
            try { args = JSON.parse(fn.arguments ?? '{}'); } catch { /* empty */ }
            console.log(`[creative-specialist:${reqId}] tool=${fn.name} args=${JSON.stringify(args).slice(0, 200)} userAuth=${body.user_auth_header ? 'yes' : 'NO'}`);

            const result = await executeCreativeTool(
              fn.name,
              args,
              supabaseAdmin,
              body.company_id,
              body.conversation_id ?? null,
              body.user_auth_header ?? '',
            );
            console.log(`[creative-specialist:${reqId}] tool=${fn.name} result.len=${result.length} preview="${result.slice(0, 200).replace(/\n/g, ' ')}"`);
            messages.push({
              role: 'tool',
              // deno-lint-ignore no-explicit-any
              tool_call_id: (tc as any).id,
              content: result,
            });
          }
          continue;
        }

        finalAnswer = msg.content ?? '(sem resposta)';
        console.log(`[creative-specialist:${reqId}] done in ${Date.now() - t0}ms tools=${toolsUsed.join(',') || 'none'} answer.len=${finalAnswer.length}`);
        break;
      }

      if (runId) {
        const finishedAt = Date.now();
        await supabaseAdmin.from('agent_runs').update({
          status: 'success',
          finished_at: new Date(finishedAt).toISOString(),
          latency_ms: finishedAt - runStart,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          cost_usd: calcCost(promptTokens, completionTokens),
          tools_used: toolsUsed,
        }).eq('id', runId);
      }

      return jsonResponse(200, {
        ok: true,
        answer: finalAnswer,
        tokens: totalTokens,
        cost_usd: calcCost(promptTokens, completionTokens),
        tools_used: toolsUsed,
        run_id: runId,
      }, cors);
    } catch (innerErr) {
      const errMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
      if (runId) {
        const finishedAt = Date.now();
        await supabaseAdmin.from('agent_runs').update({
          status: 'error',
          finished_at: new Date(finishedAt).toISOString(),
          latency_ms: finishedAt - runStart,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          cost_usd: calcCost(promptTokens, completionTokens),
          tools_used: toolsUsed,
          error_message: errMsg.substring(0, 500),
        }).eq('id', runId);
      }
      throw innerErr;
    }
  } catch (err) {
    console.error('[creative-specialist] unexpected:', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return jsonResponse(500, { ok: false, error: msg }, getCorsHeaders(req));
  }
});

function jsonResponse(status: number, body: unknown, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// deno-lint-ignore no-explicit-any
async function executeCreativeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: any,
  companyId: string,
  conversationId: string | null,
  userAuthHeader: string,
): Promise<string> {
  try {
    switch (name) {
      case 'generate_creative':
        return await invokeCreativeGenerate(userAuthHeader, args as never, conversationId);
      case 'iterate_creative':
        return await invokeCreativeIterate(userAuthHeader, args as never, 'iterate');
      case 'vary_creative':
        return await invokeCreativeIterate(
          userAuthHeader,
          { ...(args as object), mode: 'vary', count: 3 } as never,
          'vary',
        );
      case 'adapt_creative':
        return await invokeCreativeAdapt(userAuthHeader, args as never, conversationId);
      case 'compare_creatives':
        return await compareCreatives(supabase, companyId, args as { creative_ids?: string[]; creative_names?: string[] });
      case 'search_knowledge':
        return await searchKnowledge(supabase, companyId, args as { query: string; top_k?: number; filters?: Record<string, unknown> });
      default:
        return `Tool "${name}" nao reconhecida pelo creative-specialist.`;
    }
  } catch (err) {
    console.error(`[creative-specialist] tool ${name} threw:`, err);
    return `Erro ao executar ${name}: ${err instanceof Error ? err.message : String(err)}`;
  }
}
