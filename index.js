const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

console.log('🚀 Iniciando Bot Alumividros...');

// Configurar Claude
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('✅ Claude configurado');

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
- Faça cálculos quando o cliente fornecer medidas (ex: espelho 1,5x2m = 3m² x R$ 350 = R$ 1.050)
- Ofereça sempre as duas opções de preço para espelhos (com instalação e buscar na loja com desconto)
`;

// Servidor Express
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rota principal
app.get('/', (req, res) => {
    res.json({
        status: '🤖 Bot Alumividros funcionando!',
        message: 'Sistema ativo e pronto para receber mensagens',
        timestamp: new Date().toISOString(),
        whatsapp: 'Aguardando integração',
        claude: 'Conectado'
    });
});

// Rota de saúde
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        bot: 'Alumividros',
        claude: anthropic ? 'Connected' : 'Disconnected'
    });
});

// Rota para testar Claude
app.post('/test-claude', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.json({ error: 'Envie uma mensagem no campo "message"' });
        }

        console.log(`🧪 Teste do Claude: ${message}`);
        
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
                role: 'user',
                content: `${contextoPadrao}\n\nCliente: ${message}\n\nResponda como o chatbot da Alumividros.`
            }]
        });
        
        let resposta = response.content[0].text;
        
        console.log(`✅ Resposta do Claude: ${resposta.substring(0, 100)}...`);
        
        res.json({
            success: true,
            input: message,
            response: resposta,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro ao testar Claude:', error);
        res.status(500).json({
            error: 'Erro ao processar mensagem',
            details: error.message
        });
    }
});

// Rota para simular WhatsApp (para testes)
app.post('/whatsapp-webhook', async (req, res) => {
    try {
        const { message, from } = req.body;
        
        console.log(`📱 Simulação WhatsApp de ${from}: ${message}`);
        
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
                role: 'user',
                content: `${contextoPadrao}\n\nCliente: ${message}\n\nResponda como o chatbot da Alumividros.`
            }]
        });
        
        let resposta = response.content[0].text;
        
        if (resposta.includes('não consigo') || resposta.includes('não sei')) {
            resposta += `\n\n👤 **O Douglas vai entrar em contato com você para resolver!**`;
        }
        
        console.log(`✅ Resposta enviada para ${from}`);
        
        res.json({
            success: true,
            from: from,
            message: message,
            response: resposta,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            error: 'Erro ao processar mensagem',
            details: error.message
        });
    }
});

const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP rodando na porta ${PORT}`);
    console.log(`🌐 URL: https://bot-alumividros-production.up.railway.app`);
    console.log(`🧪 Teste Claude: POST /test-claude com {"message": "oi"}`);
    console.log(`📱 Webhook WhatsApp: POST /whatsapp-webhook`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Finalizando servidor...');
    server.close(() => {
        process.exit(0);
    });
});

console.log('✅ Bot Alumividros inicializado com sucesso!');
