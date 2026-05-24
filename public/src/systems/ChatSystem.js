// ChatSystem.js — Chat de texto em tempo real via Socket.io
// Enter abre/fecha o input; Enter novamente envia; Escape cancela

export class ChatSystem {
  constructor(network, playerName) {
    this._net      = network;
    this._name     = playerName || 'Player';
    this._open     = false;
    this._panel    = document.getElementById('chat-panel');
    this._log      = document.getElementById('chat-log');
    this._wrap     = document.getElementById('chat-input-wrap');
    this._input    = document.getElementById('chat-input');
    if (!this._panel) return;

    this._panel.style.display = 'block';

    this._input?.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { this._send(); e.preventDefault(); }
      if (e.key === 'Escape') { this._close(); e.preventDefault(); }
    });

    // Ouvir mensagens recebidas
    network?.socket?.on('chatMsg', ({ name, text, id }) => {
      const isSelf = id === network.socket?.id;
      this._addLine(name, text, isSelf);
    });
  }

  // Chamado pelo GameScene quando jogador pressiona Enter fora de input de texto
  tryOpen() {
    if (this._open) return false;
    this._open = true;
    if (this._wrap) this._wrap.style.display = 'block';
    this._input?.focus();
    return true;
  }

  _close() {
    this._open = false;
    if (this._wrap) this._wrap.style.display = 'none';
    if (this._input) this._input.value = '';
    this._input?.blur();
  }

  _send() {
    const text = this._input?.value?.trim();
    if (!text) { this._close(); return; }
    // Exibir localmente
    this._addLine(this._name, text, true);
    // Enviar para o servidor
    this._net?.socket?.emit('chatMsg', { text, name: this._name });
    this._close();
  }

  _addLine(name, text, isSelf) {
    if (!this._log) return;
    const line = document.createElement('div');
    line.className = 'chat-line';
    line.innerHTML = `<span class="chat-name${isSelf ? ' self' : ''}">${name}:</span> ${text}`;
    this._log.appendChild(line);
    // Manter no máximo 12 linhas visíveis
    while (this._log.children.length > 12) this._log.removeChild(this._log.firstChild);
    this._log.scrollTop = this._log.scrollHeight;
    // Auto-remover após 8s
    setTimeout(() => line.remove(), 8000);
  }

  isOpen() { return this._open; }

  destroy() {
    if (this._panel) this._panel.style.display = 'none';
    this._net?.socket?.off('chatMsg');
    this._close();
  }
}
