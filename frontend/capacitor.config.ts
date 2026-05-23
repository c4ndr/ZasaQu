import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zasaqu.app',
  appName: 'ZasaQu',
  webDir: 'dist',

  server: {
    // Untuk live dev via emulator — arahkan ke IP lokal server
    // url: 'http://192.168.1.4:5173',
    // cleartext: true,
  },

  android: {
    allowMixedContent: true,   // izinkan HTTP karena belum pakai HTTPS
    backgroundColor: '#0C0C16',
  },

  plugins: {
    Geolocation: {
      permissions: ['location'],
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      permissions: ['camera', 'photos'],
    },
  },
}

export default config
