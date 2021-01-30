
const onload = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room');
  console.log('this is the room', room)

  //const socketUrl = 'http://localhost:3000';
  const socketUrl = 'https://safe-spire-04823.herokuapp.com';
  const socketBuilder = new SocketBuilder({ socketUrl });

  const peerConfig = Object.values({
    id: undefined,
    config: {
      host: 'guarded-forest-94614.herokuapp.com',
      secure: true,
      //port: 9000,
      //host: 'localhost',
      path: '/'
    }
  });

  const peerBuilder = new PeerBuilder({ peerConfig });

  const view = new View();
  const media = new Media();

  const deps = {
    room,
    media,
    view,
    socketBuilder,
    peerBuilder
  };

  Business.initialize(deps);
}

window.onload = onload