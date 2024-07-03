class WebSocketManager {
  constructor() {
    this.gameSocket = null;
    this.friendSocket = null;
    this.isGameSocketConnecting = false;
  }

  returnGameSocket() {
    return this.gameSocket;
  }

  connectGameSocket(url) {
    if (
      !this.gameSocket ||
      this.gameSocket.readyState === WebSocket.CLOSED ||
      this.gameSocket.readyState === WebSocket.CLOSING
    ) {
      this.isGameSocketConnecting = true;
      this.gameSocket = new WebSocket(url);
      this.setupGameSocketListeners(url);
    }
  }

  connectFriendSocket(url) {
    if (
      !this.friendSocket ||
      this.friendSocket.readyState === WebSocket.CLOSED ||
      this.friendSocket.readyState === WebSocket.CLOSING
    ) {
      this.friendSocket = new WebSocket(url);
      this.setupFriendSocketListeners(url);
    }
  }

  setupGameSocketListeners(url) {
    this.gameSocket.onopen = () => {
      this.isGameSocketConnecting = false;
    };
    this.gameSocket.onclose = () => {
      this.isGameSocketConnecting = false;
    };
    this.gameSocket.onerror = (event) => {
      console.error('Game socket error:', event);
      if (!this.isGameSocketConnecting) {
        this.connectGameSocket(url);
      }
    };
  }

  setupFriendSocketListeners(url) {
    this.friendSocket.onopen = (event) => {
      console.log('Friend socket connected');
    };
    this.friendSocket.onmessage = (event) => {
      console.log('Message from friend socket:', event.data);
    };
    this.friendSocket.onclose = (event) => {
      console.log('Friend socket closed');
    };
    this.friendSocket.onerror = (event) => {
      this.connectFriendSocket(url);
    };
  }

  closeGameSocket() {
    if (this.gameSocket && this.gameSocket.readyState === WebSocket.OPEN) {
      this.gameSocket.close();
      this.gameSocket = null;
    }
  }

  closeFriendSocket() {
    if (this.friendSocket && this.friendSocket.readyState === WebSocket.OPEN) {
      this.friendSocket.close();
      this.friendSocket = null;
    }
  }
}

export default new WebSocketManager();
