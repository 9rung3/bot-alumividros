const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const qrcode = require('qrcode');

console.log('🚀 Iniciando Bot Alumividros com QR Web...');

// Configurar Claude
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('✅ Claude configurado');

// Variáveis para WhatsApp
let whatsappClient = null;
let whatsappStatus = 'Desconectado';
let currentQR = null;
let qrImageData = null;

// Contexto para Claude
const contextoPadrao = `
Você é o chatbot da Alumividros, vidraçaria do Douglas em Tiros/MG.
Tom: bem descontraído, simpático e próximo do cliente.

COMO SE APRESENTAR:
- "Oi! Sou o chatbot da Alumividros! 😊"
- "Tô aqui pra facilitar sua vida com orçamentos e dúvidas 24h por dia!"

INFORMAÇÕES PRINCIPAIS:
- Endereço: Rua Padre José Coelho, 625, Tiros, MG - CEP: 38880-000
- Horário: Segunda a sexta, 7h às 17h  
- Instagram: @alumividros.tiros
- Atendemos toda região do Alto Paranaíba
- Frete gratuito em Tiros/MG
- Funcionários: Douglas (contato principal), Bruno e Tonny (manutenção)

PRODUTOS E PREÇOS:
- Espelhos 3mm: R$ 350/m² (5% desconto se buscar)
- Espelhos 4mm bisotado: R$ 400/m² (5% desconto se buscar)
- Vidros comuns incolor 3mm: R$ 200/m² + 10% instalação
- Vidros comuns incolor 4mm: R$ 220/m² + 10% instalação  
- Vidros fumê 3mm: R$ 220/m² + 10% instalação
- Vidros fumê 4mm: R$ 240/m² + 10% instalação
- Box incolor 8mm: R$ 300/m² (altura 2m)
- Box fumê 8mm: R$ 330/m² (altura 2m)
- Janelas 120x100 incolor: R$ 580
- Janelas 120x100 fumê: R$ 680
- Janelas 150x100 incolor: R$ 680
- Janelas 150x100 fumê: R$ 780
- Manutenção box (só silicone): R$ 40
- Manutenção box (roldanas + regulagem): R$ 100
- Manutenção box (completa): R$ 140
- Retrovisores: carro R$ 30, caminhão R$ 50, moto R$ 20

PAGAMENTOS:
- Cartão: até 6x sem juros (parcela mín R$ 200)
- Cheque: até 3x sem entrada (a partir R$ 1.000)
- À vista: a partir R$ 2.000 (50% entrada + 50% depois)
- Dinheiro/Pix: 5% desconto

REGRAS:
- Funciona 24h por dia
- Para serviços sob medida: visita técnica obrigatória
- Para janelas não padrão, varandas, guarda-corpo: medição no local
- Douglas pode estar disponível fora do horário comercial
- Sempre colete nome, endereço e telefone para orçamentos
- Seja descontraído mas profissional
- Faça cálculos quando o cliente fornecer medidas
- Ofereça sempre as duas opções de preço para espelhos
`;

// Função para inicializar WhatsApp
async function inicializarWhatsApp() {
    try {
        console.log('📱 Carregando WhatsApp Web...');
        
        const { Client, LocalAuth } = require('whatsapp-web.js');
        
        whatsappClient = new Client({
            authStrategy: new LocalAuth({
                dataPath: '/tmp/.wwebjs_auth'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            }
        });

        whatsappClient.on('qr', async (qr) => {
            console.log('📱 QR Code gerado!');
            currentQR = qr;
            whatsappStatus = 'Aguardando QR Code';
            
            try {
                // Gerar imagem do QR code
                qrImageData = await qrcode.toDataURL(qr, {
                    width: 256,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                console.log('✅ QR Code convertido para imagem');
            } catch (err) {
                console.error('❌ Erro ao gerar QR image:', err);
            }
        });

        whatsappClient.on('ready', () => {
            console.log('🎉 WhatsApp conectado com sucesso!');
            whatsappStatus = 'Conectado';
            currentQR = null;
            qrImageData = null;
        });

        whatsappClient.on('authenticated', () => {
            console.log('✅ WhatsApp autenticado');
            whatsappStatus = 'Autenticado';
        });

        whatsappClient.on('auth_failure', (msg) => {
            console.error('❌ Falha na autenticação:', msg);
            whatsappStatus = 'Erro de autenticação';
            currentQR = null;
            qrImageData = null;
        });

        whatsappClient.on('disconnected', (reason) => {
            console.log('🔌 WhatsApp desconectado:', reason);
            whatsappStatus = 'Desconectado';
            currentQR = null;
            qrImageData = null;
        });

        whatsappClient.on('message', async (message) => {
            if (!message.from.includes('@c.us')) return;
            if (message.fromMe) return;
            
            try {
                console.log(`📩 WhatsApp - ${message.from}: ${message.body}`);
                
                const resposta = await processarComClaude(message.body);
                await message.reply(resposta);
                
                console.log(`✅ Resposta enviada via WhatsApp`);
                
                // Delay humano
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
                
            } catch (error) {
                console.error('❌ Erro ao processar mensagem:', error);
                try {
                    await message.reply('Ops! Tive um probleminha técnico. 😅\nO Douglas vai entrar em contato com você!');
                } catch (replyError) {
                    console.error('❌ Erro ao enviar resposta de erro:', replyError);
                }
            }
        });

        await whatsappClient.initialize();
        console.log('✅ WhatsApp inicializado');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar WhatsApp:', error);
        whatsappStatus = 'Erro - APIs REST apenas';
    }
}

// Função para processar com Claude
async function processarComClaude(mensagem) {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
                role: 'user',
                content: `${contextoPadrao}\n\nCliente: ${mensagem}\n\nResponda como o chatbot da Alumividros.`
            }]
        });
        
        let resposta = response.content[0].text;
        
        if (resposta.includes('não consigo') || resposta.includes('não sei')) {
            resposta += `\n\n👤 **O Douglas vai entrar em contato com você para resolver!**`;
        }
        
        return resposta;
        
    } catch (error) {
        console.error('❌ Erro Claude:', error);
        return 'Ops! Tive um probleminha técnico. 😅\nO Douglas vai entrar em contato com você!';
    }
}

// Servidor Express
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Página principal com QR Code
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bot Alumividros - WhatsApp</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
                width: 100%;
            }
            h1 {
                color: #333;
                margin-bottom: 10px;
            }
            .status {
                padding: 10px 20px;
                border-radius: 25px;
                margin: 20px 0;
                font-weight: bold;
            }
            .connected { background: #d4edda; color: #155724; }
            .waiting { background: #fff3cd; color: #856404; }
            .error { background: #f8d7da; color: #721c24; }
            .qr-container {
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
            }
            .qr-image {
                max-width: 100%;
                height: auto;
            }
            .refresh-btn {
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin: 10px;
            }
            .refresh-btn:hover {
                background: #0056b3;
            }
            .info {
                background: #e7f3ff;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                text-align: left;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Bot Alumividros</h1>
            <p>Sistema de atendimento inteligente 24h</p>
            
            <div class="status ${whatsappStatus === 'Conectado' ? 'connected' : whatsappStatus.includes('Aguardando') ? 'waiting' : 'error'}">
                Status: ${whatsappStatus}
            </div>
            
            ${qrImageData ? `
                <div class="qr-container">
                    <h3>📱 Escaneie o QR Code com seu WhatsApp:</h3>
                    <img src="${qrImageData}" alt="QR Code WhatsApp" class="qr-image">
                    <br>
                    <button class="refresh-btn" onclick="window.location.reload()">🔄 Atualizar</button>
                </div>
            ` : whatsappStatus === 'Conectado' ? `
                <div class="qr-container">
                    <h3>✅ WhatsApp Conectado!</h3>
                    <p>Seu bot está funcionando e pronto para receber mensagens!</p>
                </div>
            ` : `
                <div class="qr-container">
                    <h3>⏳ Aguardando conexão...</h3>
                    <button class="refresh-btn" onclick="window.location.reload()">🔄 Atualizar</button>
                </div>
            `}
            
            <div class="info">
                <strong>📞 Informações da Alumividros:</strong><br>
                📍 Rua Padre José Coelho, 625, Tiros/MG<br>
                ⏰ Segunda a sexta, 7h às 17h<br>
                📱 Instagram: @alumividros.tiros<br>
                🤖 Claude: Conectado<br>
                🌐 Sistema: Ativo
            </div>
        </div>
        
        <script>
            // Auto-refresh a cada 10 segundos se aguardando QR
            if ('${whatsappStatus}'.includes('Aguardando') || '${whatsappStatus}' === 'Desconectado') {
                setTimeout(() => {
                    window.location.reload();
                }, 10000);
            }
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// API Status
app.get('/api/status', (req, res) => {
    res.json({
        whatsapp: whatsappStatus,
        claude: 'Conectado',
        qr: currentQR ? 'Disponível' : 'Não disponível',
        timestamp: new Date().toISOString()
    });
});

// Teste Claude
app.post('/test-claude', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.json({ error: 'Envie uma mensagem no campo "message"' });
        }

        const resposta = await processarComClaude(message);
        
        res.json({
            success: true,
            input: message,
            response: resposta,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Erro ao processar mensagem',
            details: error.message
        });
    }
});

const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: https://bot-alumividros-production.up.railway.app`);
    console.log(`📱 QR Code disponível na página principal`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Finalizando...');
    if (whatsappClient) {
        whatsappClient.destroy();
    }
    server.close(() => {
        process.exit(0);
    });
});

console.log('✅ Bot inicializado - aguarde 5 segundos para WhatsApp...');

// Inicializar WhatsApp após delay
setTimeout(() => {
    inicializarWhatsApp();
}, 5000);
