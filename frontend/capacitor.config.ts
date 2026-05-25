import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'com.zasaqu.app',
  appName: 'ZasaQu',
  webDir:  'dist',

  server: {
    // Live dev via emulator: uncomment baris di bawah, isi IP komputer dev
    // url: 'http://192.168.x.x:5173',
    // cleartext: true,
    //
    // Produksi: biarkan kosong — app serve dari dist/ yang sudah di-build
  },

  android: {
    allowMixedContent: true,    // izinkan HTTP (ubah ke false jika server sudah HTTPS)
    backgroundColor:   '#0C0C16',
    // Minta izin lokasi presisi tinggi (foreground)
    useLegacyBridge: false,
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
    SplashScreen: {
      launchAutoHide:     true,
      backgroundColor:    '#0C0C16',
      androidSplashResourceName: 'splash',
      showSpinner:        false,
    },
  },
}

export default config
