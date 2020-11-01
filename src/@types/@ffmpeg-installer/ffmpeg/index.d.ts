declare module '@ffmpeg-installer/ffmpeg' {
  interface FFMpegInstaller {
    path: string
    version: string
  }
  const installer: FFMpegInstaller
  export = installer
}
