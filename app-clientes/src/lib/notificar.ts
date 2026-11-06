/**
 * Notificações do sistema (aparecem fora do app). Funcionam quando a cliente
 * abre o app. Para avisar com o app fechado, falta um servidor de push (VAPID).
 */
export const suportaNotificacoes = () => typeof Notification !== 'undefined'
export const notificacoesAtivas = () => suportaNotificacoes() && Notification.permission === 'granted'

export async function pedirPermissao() {
  if (!suportaNotificacoes()) return false
  return (await Notification.requestPermission()) === 'granted'
}

export async function mostrarNotificacaoSistema(titulo: string, corpo: string) {
  if (!notificacoesAtivas()) return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(titulo, { body: corpo, icon: '/icon-192.png', badge: '/icon-192.png' })
    else new Notification(titulo, { body: corpo, icon: '/icon-192.png' })
  } catch {
    /* navegador sem suporte */
  }
}
