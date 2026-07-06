# Configuração do Modo Tor no SpartaBrowser

## O que é o Modo Tor?

O SpartaBrowser integra o Tor **nativamente**, iniciando e gerenciando seu próprio processo Tor. Isso proporciona:
- **Anonimato Real**: Todo o tráfego passa pela rede Tor
- **Privacidade Total**: Oculta seu IP e dificulta rastreamento  
- **Acesso a .onion**: Sites hidden services da rede Tor
- **Gestão Automática**: Não precisa manter Tor Browser aberto

## Instalação Rápida (Windows)

### Opção 1: Instalação Manual (Recomendado)

1. **Baixe o Tor Expert Bundle**:
   - Acesse: https://www.torproject.org/download/tor/
   - Baixe "Expert Bundle" para Windows

2. **Extraia para C:\Tor\**:
   ```
   C:\Tor\
   └── Tor\
       ├── tor.exe
       ├── libcrypto-1_1.dll
       ├── libssl-1_1.dll
       └── (outros arquivos)
   ```

3. **Pronto!** O SpartaBrowser detecta automaticamente

### Opção 2: Usar Tor Browser

Se você já tem o Tor Browser instalado:
- O Sparta detecta em: `%LOCALAPPDATA%\Tor Browser\Browser\TorBrowser\Tor\tor.exe`

## Como Usar

1. **Ative o Modo Tor**: Clique no botão 🛡️ (escudo)
2. **Aguarde a Conexão**: ~15-30 segundos
3. **Navegue com Segurança**: Ícone fica roxo quando ativo
4. **Desative quando quiser**: Clique novamente no 🛡️

## Verificando Conexão

Visite: **https://check.torproject.org/**

## Sites .onion

- DuckDuckGo: `https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion`

## Troubleshooting

### "Tor não encontrado"
- Baixe e instale em `C:\Tor\`

### "Erro ao iniciar"
- Execute como administrador
- Libere no Firewall
- Feche outros programas Tor

---
**SpartaBrowser** - Privacidade Real 🛡️
