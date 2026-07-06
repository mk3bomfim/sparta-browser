# 🛡️ SpartaBrowser

Navegador minimalista focado em **privacidade e segurança** com **Tor integrado nativamente**.

## ✨ Funcionalidades

- 🔒 **Modo Tor Nativo** - Tor embutido, sem instalação externa
- 🌙 **Tema Dark/Light** - Alternância automática
- 📑 **Sistema de Abas** - Gerenciamento completo de tabs
- 📚 **Histórico** - Com busca e limpeza individual
- 📥 **Downloads** - Gerenciador integrado
- 🔍 **Zoom Avançado** - Ctrl+Scroll, independente por aba
- 🖥️ **DevTools** - F12 para debugging
- 🎯 **Homepage** - Busca centralizada

## 🚀 Instalação Rápida

```bash
# 1. Clone o repositório
git clone <repo-url>
cd browser

# 2. Instale dependências
npm install

# 3. Baixe o Tor (IMPORTANTE!)
npm run download-tor

# 4. Inicie o navegador
npm start
```

## 🔧 Instalação do Tor

### Opção 1: Automática (Recomendado)

```bash
npm run download-tor
```

Isso baixa e configura o Tor Expert Bundle automaticamente em `resources/tor/`.

### Opção 2: Manual

Se o download automático falhar:

1. Baixe: https://www.torproject.org/download/tor/
2. Escolha: **Tor Expert Bundle (Windows x64)**
3. Extraia para: `browser/resources/tor/`
4. Estrutura final:
   ```
   browser/
   └── resources/
       └── tor/
           └── Tor/
               ├── tor.exe
               ├── libcrypto-1_1.dll
               ├── libssl-1_1.dll
               └── ...
   ```

## 📖 Como Usar

### Modo Tor

1. **Ativar**: Clique no ícone 🛡️ (escudo) na barra superior
2. **Aguarde**: ~15-30 segundos para conectar
3. **Confirmação**: Ícone fica roxo quando ativado
4. **Verificar**: Visite https://check.torproject.org/

### Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+T` | Nova aba |
| `Ctrl+W` | Fechar aba |
| `Ctrl+Tab` | Próxima aba |
| `Ctrl+Shift+Tab` | Aba anterior |
| `Ctrl++` | Aumentar zoom |
| `Ctrl+-` | Diminuir zoom |
| `Ctrl+0` | Resetar zoom |
| `Ctrl+Scroll` | Zoom com mouse |
| `Alt+F` | Menu |
| `F11` | Tela cheia |
| `F12` | DevTools |

### Sites .onion

Com Tor ativado, acesse:

- DuckDuckGo: `https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion`
- ProtonMail: `https://protonmailrmez3lotccipshtkleegetolb73fuirgj7r4o4vfu7ozyd.onion`

## 🏗️ Arquitetura

```
SpartaBrowser
├── src/
│   ├── main.js           # Processo principal Electron
│   ├── preload.js        # Bridge segura IPC
│   ├── view-preload.js   # Script para BrowserView
│   └── renderer/         # Interface do usuário
│       ├── index.html
│       ├── renderer.js
│       └── styles.css
├── resources/
│   └── tor/              # Tor binário nativo
└── package.json
```

## 🔐 Privacidade & Segurança

### Recursos de Privacidade

- ✅ Sessão temporária (`partition: opsec-temp`)
- ✅ Headers DNT (Do Not Track)
- ✅ Header Sec-GPC (Global Privacy Control)
- ✅ Remoção automática de Referer
- ✅ Bloqueio de todas as permissões
- ✅ Limpeza de cache/storage ao fechar
- ✅ Botão "Purge" para limpeza manual

### Modo Tor

- ✅ Processo Tor nativo gerenciado pelo app
- ✅ SOCKS5 proxy em localhost (127.0.0.1:9150)
- ✅ Circuito Tor para todo o tráfego
- ✅ Acesso a serviços .onion
- ✅ Anonimização de IP
- ✅ Bootstrap monitoring em tempo real

## 🛠️ Desenvolvimento

### Estrutura de Abas

Cada aba é um `BrowserView` independente com:
- Histórico próprio
- Zoom independente
- Sessão compartilhada (opsec-temp)

### Gerenciamento do Tor

```javascript
// Inicia Tor como processo filho
startTorProcess() → spawn('tor.exe')
                 ↓
         127.0.0.1:9150 (SOCKS5)
                 ↓
         Session Proxy Config
                 ↓
         BrowserView → Tor Network
```

### Debug

```bash
# Ver logs do Tor
npm start
# Abra DevTools (F12) e veja console

# Logs do Electron
electron . --enable-logging
```

## 📝 Scripts

```bash
npm start          # Inicia o navegador
npm run download-tor  # Baixa Tor Expert Bundle
```

## ⚠️ Troubleshooting

### "Tor não encontrado"

```bash
# Solução 1: Download automático
npm run download-tor

# Solução 2: Verificar instalação
dir resources\tor\Tor\tor.exe

# Solução 3: Download manual
# Baixe de: https://www.torproject.org/download/tor/
# Extraia em: resources/tor/
```

### "Erro ao iniciar Tor"

- Execute como administrador
- Libere no Windows Firewall
- Adicione exceção no antivírus
- Verifique se porta 9150 está livre

### "Sites .onion não carregam"

- Verifique se Tor está ativado (ícone roxo)
- Aguarde bootstrap completo (~30s)
- Veja console para erros: F12 → Console

## 📄 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas!

## ⚡ Roadmap

- [x] Abas persistentes entre sessões
- [x] Favoritos/Bookmarks
- [x] Extensões básicas
- [x] Modo de navegação privada adicional
- [ ] Suporte a outros sistemas operacionais
- [x] Bridge/Pluggable transports no Tor
- [x] Interface de configuração do Tor

---

**SpartaBrowser** - Privacidade por Design 🛡️