import { registerSW } from 'virtual:pwa-register'

export function registerUnrocherPWA() {
  const updateSW = registerSW({
    immediate: false,
    onNeedRefresh() {
      const ok = window.confirm('新しいバージョンがあります。更新しますか？')
      if (ok) updateSW(true)
    },
    onOfflineReady() {
      console.log('アンロシェTメーカーはオフライン準備OKです。')
    },
  })

  return updateSW
}
