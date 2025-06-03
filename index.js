const { Client, LocalAuth } = require('whatsapp-web.js');
const Anthropic = require('@anthropic-ai/sdk');
const express = require('express');

console.log('🚀 Iniciando Bot Alumividros...');

// Configurar Claude
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('✅ Claude configurado');

// Configuração otimizada para Railway
const client = new Client({
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
        ],
        executablePath: process.env.CHROME_BIN || null
    }
});

console.log('✅ WhatsApp Client configurado');

// Contexto para Claude
const contextoPadrao = `
Você é o chatbot da Alumividros, vidraçaria do Douglas em Tiros/MG.
Tom: bem descontraído, simpático e próximo do cliente.

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
`;

// Event handlers
client.on('qr', (qr) => {
    console.log('📱 QR Code gerado:');
    console.log(qr);
    console.log('👆 Escaneie o QR code acima com seu WhatsApp');
});

client.on('ready', () => {
    console.log('🤖 Bot Alumividros conectado e funcionando!');
});

client.on('authenticated', () => {
    console.log('✅ WhatsApp autenticado com sucesso');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.log('🔌 WhatsApp desconectado:', reason);
});

client.on('message', async (message) => {
    // Só responde mensagens privadas
    if (!message.from.includes('@c.us')) return;
    if (message.fromMe) return;
    
    try {
        console.log(`📩 Mensagem de ${message.from}: ${message.body}`);
        
        // Processar com Claude
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
                role: 'user',
                content: `${contextoPadrao}\n\nCliente: ${message.body}\n\nResponda como o chatbot da Alumividros. Faça cálculos quando possível e colete dados para orçamentos.`
            }]
        });
        
        let resposta = response.content[0].text;
        
        // Se Claude não conseguir resolver
        if (resposta.includes('não consigo') || resposta.includes('não sei')) {
            resposta += `\n\n👤 **O Douglas vai entrar em contato com você para resolver!**`;
        }
        
        await message.reply(resposta);
        console.log(`✅ Resposta enviada para ${message.from}`);
        
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

// Inicializar WhatsApp
console.log('🔄 Inicializando WhatsApp...');
client.initialize().catch(error => {
    console.error('❌ Erro ao inicializar WhatsApp:', error);
});

// Servidor Express
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        status: 'Bot Alumividros funcionando! 🤖',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', bot: 'Alumividros' });
});

const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP rodando na porta ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, finalizando...');
    server.close(() => {
        client.destroy();
        process.exit(0);
    });
});
