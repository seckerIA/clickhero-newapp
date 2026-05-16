// Passo 7 do wizard — conexao Meta (Business Manager + contas). Reutiliza fluxo de Integracoes.

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ExternalLink, Loader2, Settings2 } from 'lucide-react';
import { useMetaConnect } from '@/hooks/use-meta-connect';
import { MetaAssetPicker } from '@/components/meta/MetaAssetPicker';
import { useToast } from '@/hooks/use-toast';

interface Props {
  disabled?: boolean;
  onFinish: () => void;
  onBack: () => void;
}

export function StepMetaConnect({ disabled, onFinish, onBack }: Props) {
  const {
    integration,
    isLoading,
    isConnected,
    connect,
    isConnecting,
  } = useMetaConnect();
  const [pickerActive, setPickerActive] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const open = () => setPickerActive(true);
    window.addEventListener('meta-oauth-completed', open);
    return () => window.removeEventListener('meta-oauth-completed', open);
  }, []);

  if (pickerActive && isConnected) {
    return (
      <div className="flex flex-col h-[65vh] min-h-[480px]">
        <MetaAssetPicker
          onComplete={() => {
            setPickerActive(false);
            queryClient.invalidateQueries({ queryKey: ['meta-integration'] });
            queryClient.invalidateQueries({ queryKey: ['meta-assets'] });
            toast({
              title: 'Ativos salvos',
              description: 'Sincronizacao em background. Você ja pode usar o painel.',
            });
            onFinish();
          }}
          onCancel={() => setPickerActive(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        <p>
          Para importar campanhas, métricas e páginas do Facebook/Instagram, conecte a conta Meta ligada ao seu
          negocio (inclui Business Manager e contas de anúncio).
        </p>
        <p className="text-xs">
          Se preferir configurar depois, use <strong className="text-foreground">Ir para o app</strong> — em
          Integrações você faz o mesmo fluxo quando quiser.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <li className="rounded-full bg-muted/50 px-2.5 py-1 ring-1 ring-border">Business Manager</li>
        <li className="rounded-full bg-muted/50 px-2.5 py-1 ring-1 ring-border">Contas de anúncio</li>
        <li className="rounded-full bg-muted/50 px-2.5 py-1 ring-1 ring-border">Páginas</li>
      </ul>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isConnected ? (
        <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/30 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
              Meta conectada
            </Badge>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conta</span>
              <p className="truncate text-foreground">{integration?.facebook_user_name ?? '—'}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business</span>
              <p className="truncate text-foreground">{integration?.business_name ?? '—'}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={disabled}
            onClick={() => setPickerActive(true)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Escolher Business Managers e contas
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center space-y-4">
          <p className="text-sm text-foreground/90">
            Clique abaixo e faca login com o Facebook que administra o seu anúncio. Depois, escolha quais BMs e
            contas o app pode usar.
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={disabled || isConnecting}
            onClick={() => connect()}
          >
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
            Conectar Meta (Facebook)
          </Button>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={disabled}>
          Voltar
        </Button>
        <Button type="button" onClick={onFinish} disabled={disabled}>
          Ir para o app
        </Button>
      </div>

    </div>
  );
}
