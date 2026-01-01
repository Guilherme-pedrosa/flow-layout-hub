import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { UsuariosList } from "@/components/configuracoes/UsuariosList";

export default function Usuarios() {
  const { insights, dismiss, markAsRead } = useAiInsights('system');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gestão de usuários do sistema"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Usuários" },
        ]}
      />
      
      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando acessos e segurança do sistema"
      />

      <UsuariosList />
    </div>
  );
}
