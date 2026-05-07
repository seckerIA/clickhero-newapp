// Cards de quickstart por arquetipo de negocio.
// Spec: .kiro/specs/business-archetype-personas/ (Task 7.4)
// Consumido por ChatView no welcome state (messages.length === 0).
// Reqs: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7

import type { Archetype } from '@/types/business-archetype';

export type QuickstartCard = {
  id: string;
  title: string;       // 3-5 palavras
  prompt: string;      // texto que vai pro chat ao clicar (1-2 frases)
  icon?: string;       // nome lucide opcional
};

/** Card fixo (primeiro): produto sempre oferecer caminho pra criar campanha — backlog item 6. */
export const CREATE_AD_CAMPAIGN_QUICKSTART: QuickstartCard = {
  id: 'create-ad-campaign',
  title: 'Criar campanha de anúncio',
  prompt:
    'Quero criar uma campanha de anúncio no Meta com base no meu briefing. Antes de gerar criativo ou proposta, confirme comigo se a oferta principal cadastrada é mesmo o produto/serviço que devo anunciar agora.',
  icon: 'Megaphone',
};

export const QUICKSTART_BY_ARCHETYPE: Record<Archetype | 'fallback', QuickstartCard[]> = {
  small_local_business: [
    {
      id: 'local-bairro-7d',
      title: 'Atrair clientes do bairro',
      prompt: 'Quero criar uma campanha pra atrair clientes do meu bairro nos proximos 7 dias. Que sugere?',
      icon: 'MapPin',
    },
    {
      id: 'local-promo-fds',
      title: 'Promocao de fim de semana',
      prompt: 'Quero divulgar uma promocao especial pro fim de semana pra quem mora perto. Como monto isso?',
      icon: 'Tag',
    },
    {
      id: 'local-visitas-presenciais',
      title: 'Aumentar visitas presenciais',
      prompt: 'Como crio uma campanha que leve mais gente ate meu estabelecimento durante a semana?',
      icon: 'Store',
    },
    {
      id: 'local-instagram-bairro',
      title: 'Divulgar no Instagram local',
      prompt: 'Quero anunciar no Instagram pra pessoas que moram ate 5 km do meu negocio. Me ajuda a configurar?',
      icon: 'Instagram',
    },
  ],
  online_seller: [
    {
      id: 'ecom-carrinho-abandonado',
      title: 'Recuperar carrinho abandonado',
      prompt: 'Quero criar uma campanha de remarketing pra recuperar carrinhos abandonados da minha loja. Como faco?',
      icon: 'ShoppingCart',
    },
    {
      id: 'ecom-lancamento-colecao',
      title: 'Lancar nova colecao',
      prompt: 'Vou lancar uma colecao nova essa semana. Me ajuda a planejar a campanha de lancamento?',
      icon: 'Sparkles',
    },
    {
      id: 'ecom-promo-cupom',
      title: 'Promocao com cupom',
      prompt: 'Quero rodar uma promocao com cupom de desconto pra atrair compradores. Como estruturo?',
      icon: 'Ticket',
    },
    {
      id: 'ecom-aumentar-conversao',
      title: 'Aumentar conversao da loja',
      prompt: 'Minhas campanhas geram trafego mas pouca venda. Como melhoro a conversao?',
      icon: 'TrendingUp',
    },
  ],
  service_provider: [
    {
      id: 'servico-primeiro-orcamento',
      title: 'Receber primeiro orcamento',
      prompt: 'Quero comecar a receber pedidos de orcamento via anuncios. Como monto a primeira campanha?',
      icon: 'FileText',
    },
    {
      id: 'servico-anuncio-whatsapp',
      title: 'Anunciar servico no WhatsApp',
      prompt: 'Quero criar uma campanha que leve o cliente direto pro WhatsApp pra falar comigo. Como faco?',
      icon: 'MessageCircle',
    },
    {
      id: 'servico-consulta-gratuita',
      title: 'Atrair clientes pra consulta gratuita',
      prompt: 'Quero oferecer uma consulta gratuita como porta de entrada. Como anuncio isso?',
      icon: 'Calendar',
    },
    {
      id: 'servico-autoridade-area',
      title: 'Construir autoridade na minha area',
      prompt: 'Quero ser reconhecido como referencia na minha area. Como uso anuncios pra construir autoridade?',
      icon: 'Award',
    },
  ],
  info_product: [
    {
      id: 'info-captar-aula-gratuita',
      title: 'Captar leads pra aula gratuita',
      prompt: 'Quero captar leads pra uma aula gratuita que vou dar essa semana. Como monto a campanha?',
      icon: 'Video',
    },
    {
      id: 'info-vender-curso-frio',
      title: 'Vender meu curso pra audiencia fria',
      prompt: 'Quero vender meu curso direto pra quem ainda nao me conhece. Da pra fazer? Como?',
      icon: 'GraduationCap',
    },
    {
      id: 'info-reativar-alunos',
      title: 'Reativar alunos antigos',
      prompt: 'Quero criar uma campanha pra reativar alunos antigos com uma oferta nova. Como faco?',
      icon: 'Users',
    },
    {
      id: 'info-lancar-modulo',
      title: 'Lancar novo modulo',
      prompt: 'Vou lancar um novo modulo do meu curso. Me ajuda a planejar a campanha de lancamento?',
      icon: 'Rocket',
    },
  ],
  fallback: [
    {
      id: 'fallback-primeira-campanha',
      title: 'Criar minha primeira campanha',
      prompt: 'Quero criar minha primeira campanha no Meta Ads. Por onde comeco?',
      icon: 'PlayCircle',
    },
    {
      id: 'fallback-analisar-atuais',
      title: 'Analisar campanhas atuais',
      prompt: 'Faz uma analise das minhas campanhas ativas e me diz o que esta funcionando e o que nao esta.',
      icon: 'BarChart',
    },
    {
      id: 'fallback-gerar-criativos',
      title: 'Gerar criativos novos',
      prompt: 'Quero gerar criativos novos pra usar nas minhas campanhas. Me ajuda?',
      icon: 'Image',
    },
    {
      id: 'fallback-duvida-meta-ads',
      title: 'Tirar duvida sobre Meta Ads',
      prompt: 'Tenho uma duvida geral sobre como funciona o Meta Ads. Pode me explicar?',
      icon: 'HelpCircle',
    },
  ],
};

/**
 * Primeiro card: sempre criar campanha de anúncio (`CREATE_AD_CAMPAIGN_QUICKSTART`).
 * Demais: ate 4 cards do arquetipo (fallback omite duplicado `fallback-primeira-campanha`).
 */
export function getQuickstartCards(archetype: Archetype | null): QuickstartCard[] {
  const key = archetype ?? 'fallback';
  const list = QUICKSTART_BY_ARCHETYPE[key] ?? QUICKSTART_BY_ARCHETYPE.fallback;
  const archetypeExtras = list.filter((c) => c.id !== 'fallback-primeira-campanha');
  return [CREATE_AD_CAMPAIGN_QUICKSTART, ...archetypeExtras];
}
