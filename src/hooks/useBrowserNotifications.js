export function useBrowserNotifications() {
  const isSupported = 'Notification' in window;

  const requestPermission = async () => {
    if (!isSupported) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    return result;
  };

  const showBrowserNotif = (title, body, icon = '/favicon.ico') => {
    if (!isSupported || Notification.permission !== 'granted') return;
    const notif = new Notification(title, { body, icon });
    setTimeout(() => notif.close(), 6000);
  };

  return {
    permission: isSupported ? Notification.permission : 'unsupported',
    requestPermission,
    showBrowserNotif,
  };
}