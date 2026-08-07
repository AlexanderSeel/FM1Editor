export interface LocalAudioOutputRouter {
  connect(context: BaseAudioContext, source: AudioNode, destination: AudioNode): void
  dispose(): void
}
