export function VideoPlayer() {
  return (
    <video autoPlay muted loop style={{marginTop: '-4em', marginBottom: '-8em', width: '500px', height: '500px' }}>
      <source src="/txAnimation.mp4" />
    </video>
  )
}
