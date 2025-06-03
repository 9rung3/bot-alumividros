const { Client, LocalAuth } = require('whatsapp-web.js');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;

// Informações da empresa
const infoEmpresa = {
    nome: 'Alumividros',
    proprietario: 'Douglas',
    funcionarios: {
        manutencao: ['Bruno', 'Tonny']
    },
    endereco: 'Rua Padre José Coelho, 625, Tiros, MG',
    cep: '38880-000',
    regiao: 'Alto Paranaíba',
    cidadePrincipal: 'Tiros',
    horario: 'Segunda a sexta, 7h às 17h',
    instagram: '@alumividros.tiros',
    entrega: {
        gratuita: 'Frete gratuito em Tiros/MG',
        regiao: 'Atendemos toda região do Alto Paranaíba',
        consultar: 'Outras cidades: consultar frete'
    },
    prazos: {
        grandes: 'Serviços maiores: início em 15 dias',
        pequenos: 'Serviços pequenos: instantâneo',
        urgencia: 'Urgências: consultar disponibilidade'
    },
    garantia: {
        cobertura: 'Erro de fabricação e instalação: garantia vitalícia',
        exclusao: 'Mau uso e falta de manutenção: sem garantia',
        troca: 'Não temos política de troca'
    },
    orcamento: 'Orçamentos grátis e sem compromisso',
    pagamentoAntecipado: {
        regra: 'Serviços sob encomenda: pagamento adiantado conforme forma escolhida',
        cartao_cheque: 'Cartão/cheque: pagar no ato do pedido',
        vista: 'À vista acima de R$ 2.000: 50% adiantado (com 5% desconto)'
    },
    pagamento: {
        cartao: 'Cartão: até 6x sem juros (parcela mínima R$ 200)',
        cheque: 'Cheque: até 3x sem entrada (a partir de R$ 1.000 - sob consulta)',
        vista: 'À vista: a partir de R$ 2.000 (50% entrada + 50% após conclusão)',
        desconto: 'Dinheiro e Pix: 5% de desconto'
    }
};

// Configurar Claude
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Tabela de preços para orçamentos diretos
const tabelaPrecos = {
    espelhos: {
        '3mm': 350, // por m²
        '4mm_bisotado': 400, // por m²
        base: 'Espelho {espessura} - R$ {preco}/m² (instalado)',
        desconto: '5% desconto se buscar na loja',
        especiais: 'Para espelhos com medidas ou acabamentos especiais, preciso analisar e fazer orçamento personalizado'
    },
    vidrosComuns: {
        'incolor_3mm': 200,
        'mine_boreal': 200,
        'canelado': 200,
        'incolor_4mm': 220,
        'fume_3mm': 220,
        'fume_4mm': 240,
        instalacao: 0.10, // 10%
        base: 'Vidro comum - R$ {preco}/m² + 10% instalação (grátis se buscar na loja)',
        especiais: 'Para outros tipos de vidro comum, preciso analisar e fazer orçamento personalizado'
    },
    boxes: {
        'incolor_8mm': { preco_por_metro: 300, desc: 'Box incolor 8mm temperado (altura 2m)' },
        'fume_8mm': { preco_por_metro: 330, desc: 'Box fumê 8mm temperado (altura 2m)' },
        pronta_entrega: {
            vidros: ['incolor', 'fumê'],
            aluminios: ['prata', 'preto']
        },
        especial: 'Para outras cores de vidro e alumínio, consulte prazo de entrega'
    },
    manutencaoBox: {
        'apenas_silicone': 40,
        'roldanas_regulagem': 100,
        'completa': 140,
        desc_simples: 'Apenas silicone - R$ 40',
        desc_media: 'Troca de roldanas e regulagem - R$ 100',
        desc_completa: 'Troca de roldanas, regulagem e silicone - R$ 140'
    },
    itensAvulsos: {
        'cantoneira_2cm': 11, // por metro
        'perfil_u_8mm': 11, // por metro
        'regua_pedreiro': 36, // por metro
        'tubo_silicone': 35, // por unidade
        'tubo_50x50': 43, // por metro
        'tubo_100x50': 68, // por metro
        'botao_frances': 5, // por unidade
        desc: 'Itens avulsos para venda'
    },
    janelasPadrao: {
        '120x100_incolor': 580,
        '120x100_fume': 680,
        '150x100_incolor': 680,
        '150x100_fume': 780,
        desc: 'Janelas padrão (inclui vidro e instalação)',
        especiais: 'Para janelas de outros tamanhos, preciso fazer medição e orçamento personalizado',
        observacao: 'Para muitas janelas: possível desconto a conferir'
    },
    retrovisores: {
        'carro': 30,
        'caminhao': 50,
        'moto': 20,
        base: 'Retrovisor {tipo} - R$ {preco} (instalação inclusa)'
    }
};

// Sistema de agendamento
const agendamentos = [];
const orcamentos = [];

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Contexto específico para Claude
const contextoPadrao = `
Você é o chatbot da Alumividros, vidraçaria do Douglas em Patos de Minas/MG.
Tom: bem descontraído, simpático e próximo do cliente, como se fosse um amigo ajudando.

COMO SE APRESENTAR:
- "Oi! Sou o chatbot da Alumividros! 😊"
- "Tô aqui pra facilitar sua vida com orçamentos e dúvidas 24h por dia!"
- "Posso fazer orçamentos e agendar visitas a qualquer hora!"
- Use linguagem natural e emojis
- Seja prestativo mas sem ser exagerado

IMPORTANTE: 
- Você funciona 24h por dia, todos os dias
- Douglas pode estar disponível fora do horário comercial para urgências
- Para assuntos que você não conseguir resolver, sempre diga que o Douglas vai entrar em contato
- Para manutenções, mencione que temos especialistas (Bruno e Tonny) responsáveis por esse serviço

INFORMAÇÕES DA EMPRESA:
- Contato principal: ${infoEmpresa.proprietario}
- Equipe de manutenção: ${infoEmpresa.funcionarios.manutencao.join(' e ')}
- Endereço: ${infoEmpresa.endereco} - CEP: ${infoEmpresa.cep}
- Região: Atendemos toda região do ${infoEmpresa.regiao}, principalmente ${infoEmpresa.cidadePrincipal}
- Horário: ${infoEmpresa.horario}
- Instagram: ${infoEmpresa.instagram}
- WhatsApp: Só pelo bot (número atual)
- Entrega: ${infoEmpresa.entrega.gratuita} | ${infoEmpresa.entrega.regiao} | ${infoEmpresa.entrega.consultar}
- Prazos: ${infoEmpresa.prazos.grandes} | ${infoEmpresa.prazos.pequenos}
- Garantia: ${infoEmpresa.garantia.cobertura}
- Orçamento: ${infoEmpresa.orcamento}

FORMAS DE PAGAMENTO:
- ${infoEmpresa.pagamento.cartao}
- ${infoEmpresa.pagamento.cheque}
- ${infoEmpresa.pagamento.vista}
- ${infoEmpresa.pagamento.desconto}

REGRAS IMPORTANTES:
1. SEMPRE colete nome, endereço completo e telefone para orçamentos
2. Para agendamentos, sugira horários disponíveis (7h-17h, dias úteis)
3. Use a tabela de preços quando possível
4. Para serviços complexos, sempre agende visita técnica
5. Seja específico com endereços (rua, número, bairro, referência)

ORÇAMENTOS DIRETOS DISPONÍVEIS:
- Espelhos (3mm e 4mm bisotado)
- Vidros comuns (6 tipos diferentes)
- Boxes (incolor e fumê)
- Janelas padrão (120x100 e 150x100)
- Manutenção de box (3 níveis)
- Retrovisores e itens avulsos

PRECISA VISITA TÉCNICA (medição obrigatória):
- Fechamento de varandas
- Janelas não padrão (outros tamanhos)
- Guarda-corpo (sacadas/escadas)
- Construções completas

Para outros serviços: agende visita técnica.
`;

client.on('message', async (message) => {
    // Só responde mensagens privadas (não grupos)
    if (!message.from.includes('@c.us')) return;
    
    // Ignora mensagens próprias
    if (message.fromMe) return;
    
    // Ignora mensagens muito antigas (mais de 5 minutos)
    const agora = Date.now();
    const tempoMensagem = message.timestamp * 1000;
    if (agora - tempoMensagem > 300000) return; // 5 minutos
    
    try {
        console.log(`📩 Mensagem de ${message.from}: ${message.body}`);
        
        const resposta = await processarMensagem(message.body, message.from);
        await message.reply(resposta);
        
        console.log(`✅ Resposta enviada para ${message.from}`);
        
        // Delay para parecer humano
        await delay(1000 + Math.random() * 2000);
        
    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        
        try {
            await message.reply('Ops! Tive um probleminha técnico. 😅\n\nMas relaxa, o Douglas vai entrar em contato com você!\n\nPode tentar de novo também que já deve estar funcionando!');
        } catch (replyError) {
            console.error('❌ Erro ao enviar mensagem de erro:', replyError);
        }
    }
});

async function processarMensagem(mensagem, numeroCliente) {
    // Verificar se precisa de visita técnica obrigatória PRIMEIRO
    const visitaObrigatoria = precisaVisitaTecnica(mensagem);
    if (visitaObrigatoria) {
        return visitaObrigatoria + `

💬 **Qualquer dúvida, tô aqui! Sou o chatbot da Alumividros e adoro ajudar! 😊**`;
    }
    
    // Verificar se é orçamento direto
    const orcamentoRapido = verificarOrcamentoRapido(mensagem);
    if (orcamentoRapido) {
        return orcamentoRapido;
    }
    
    // Processar com Claude
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
            role: 'user',
            content: `${contextoPadrao}
            
Cliente: ${mensagem}
Número: ${numeroCliente}

Responda como chatbot da Alumividros. Se for solicitação de orçamento ou agendamento, colete TODOS os dados necessários.`
        }]
    });
    
    const respostaClaude = response.content[0].text;
    
    // Verificar se Claude não conseguiu resolver e adicionar encaminhamento para Douglas
    if (respostaClaude.includes('não consigo') || respostaClaude.includes('não posso') || 
        respostaClaude.includes('não sei') || respostaClaude.includes('preciso de mais informações')) {
        
        return respostaClaude + `\n\n👤 **O Douglas vai entrar em contato com você para resolver essa questão!**`;
    }
    
    // Salvar dados se for orçamento/agendamento
    await salvarDadosSeNecessario(mensagem, numeroCliente, respostaClaude);
    
    return respostaClaude;
}

// Verificar se precisa de visita técnica obrigatória
function precisaVisitaTecnica(mensagem) {
    const msg = mensagem.toLowerCase();
    
    const servicosVisitaObrigatoria = [
        'varanda', 'fechamento', 'fechar varanda',
        'guarda corpo', 'guarda-corpo', 'guardacorpo',
        'sacada', 'escada', 'construção', 'construcao',
        'obra', 'projeto'
    ];
    
    // Para janelas, só visita se NÃO for padrão
    if (msg.includes('janela') && !msg.includes('120') && !msg.includes('150') && !msg.includes('padrão') && !msg.includes('padrao')) {
        servicosVisitaObrigatoria.push('janela');
    }
    
    for (let servico of servicosVisitaObrigatoria) {
        if (msg.includes(servico)) {
            return `📐 VISITA TÉCNICA OBRIGATÓRIA

Para ${detectarTipoServico(msg)} preciso fazer medição no local antes do orçamento.

📅 **Agendamento de visita:**
• ${infoEmpresa.horario}
• ${infoEmpresa.orcamento}

Me passa:
• Seu nome completo
• Endereço completo (rua, número, bairro)
• Melhor dia e horário para visita

Vou agendar sua medição!`;
        }
    }
    
    return null;
}

function detectarTipoServico(msg) {
    if (msg.includes('varanda') || msg.includes('fechamento')) return 'fechamento de varanda';
    if (msg.includes('janela')) return 'janelas não padrão';
    if (msg.includes('guarda')) return 'guarda-corpo';
    if (msg.includes('sacada')) return 'guarda-corpo para sacada';
    if (msg.includes('escada')) return 'guarda-corpo para escada';
    if (msg.includes('construção') || msg.includes('obra')) return 'construção completa';
    return 'esse serviço';
}

function verificarOrcamentoRapido(mensagem) {
    const msg = mensagem.toLowerCase();
    
    // Se pergunta sobre entrega ou frete
    if (msg.includes('entrega') || msg.includes('frete') || msg.includes('entregar') || msg.includes('atende') || msg.includes('região')) {
        return `🚚 ENTREGA E ATENDIMENTO:

✅ **${infoEmpresa.entrega.gratuita}**

🌍 **${infoEmpresa.entrega.regiao}**

⚠️ **${infoEmpresa.entrega.consultar}**

Qual sua cidade? Posso confirmar se atendemos e o frete!`;
    }
    
    // Se pergunta sobre orçamento
    if (msg.includes('orçamento') || msg.includes('orcamento') || msg.includes('quanto custa') || msg.includes('preço') || msg.includes('preco')) {
        return `💰 ORÇAMENTOS:

✅ **${infoEmpresa.orcamento}**

📋 **Condições de pagamento:**
• ${infoEmpresa.pagamentoAntecipado.regra}
• ${infoEmpresa.pagamentoAntecipado.cartao_cheque}  
• ${infoEmpresa.pagamentoAntecipado.vista}

Qual serviço você precisa? Posso fazer seu orçamento agora!`;
    }
    
    // Se pergunta sobre prazos
    if (msg.includes('prazo') || msg.includes('demora') || msg.includes('quando') || msg.includes('urgência') || msg.includes('urgencia')) {
        return `⏰ PRAZOS DE EXECUÇÃO:

🔹 **${infoEmpresa.prazos.pequenos}**
(Manutenções, pequenos reparos)

🔹 **${infoEmpresa.prazos.grandes}**
(Boxes, espelhos grandes, projetos)

⚡ **${infoEmpresa.prazos.urgencia}**

Qual tipo de serviço você precisa?`;
    }
    
    // Se pergunta sobre garantia
    if (msg.includes('garantia') || msg.includes('defeito') || msg.includes('problema') || msg.includes('troca')) {
        return `🛡️ NOSSA GARANTIA:

✅ **${infoEmpresa.garantia.cobertura}**

❌ **${infoEmpresa.garantia.exclusao}**

⚠️ **${infoEmpresa.garantia.troca}**

Trabalhamos com qualidade para você ter tranquilidade total!`;
    }
    
    // Se pergunta sobre pagamento
    if (msg.includes('pagamento') || msg.includes('pagar') || msg.includes('cartão') || msg.includes('cheque') || msg.includes('vista') || msg.includes('pix') || msg.includes('desconto')) {
        return `💳 FORMAS DE PAGAMENTO:

🔹 **${infoEmpresa.pagamento.cartao}**

🔹 **${infoEmpresa.pagamento.cheque}**

🔹 **${infoEmpresa.pagamento.vista}**

💰 **${infoEmpresa.pagamento.desconto}**

📋 **Para serviços sob encomenda:**
• ${infoEmpresa.pagamentoAntecipado.cartao_cheque}
• ${infoEmpresa.pagamentoAntecipado.vista}

Qual valor do seu orçamento? Posso te ajudar a escolher a melhor forma!`;
    }
    
    // ESPELHOS
    if (msg.includes('espelho')) {
        const dimensoes = extrairDimensoes(mensagem);
        if (dimensoes) {
            const area = dimensoes.largura * dimensoes.altura;
            
            // Verificar se é bisotado
            const ehBisotado = msg.includes('bisot') || msg.includes('4mm');
            const tipoEspelho = ehBisotado ? '4mm_bisotado' : '3mm';
            const descricao = ehBisotado ? '4mm bisotado' : '3mm';
            
            const precoComInstalacao = (area * tabelaPrecos.espelhos[tipoEspelho]).toFixed(2);
            const precoComDesconto = (area * tabelaPrecos.espelhos[tipoEspelho] * 0.95).toFixed(2);
            
            return `🪞 ORÇAMENTO ESPELHO ${descricao.toUpperCase()} (${dimensoes.largura}x${dimensoes.altura}m = ${area.toFixed(2)}m²):

💰 **Com instalação:** R$ ${precoComInstalacao}
🏪 **Se buscar na loja:** R$ ${precoComDesconto} (5% desconto)

Inclui corte, lapidação e instalação.
Precisa do seu endereço para confirmar!

Quer que eu agende uma visita?`;
        }
        
        return `🪞 ESPELHOS (instalação inclusa):

• **3mm:** R$ ${tabelaPrecos.espelhos['3mm']}/m²
• **4mm bisotado:** R$ ${tabelaPrecos.espelhos['4mm_bisotado']}/m²

💡 ${tabelaPrecos.espelhos.desconto}

⚠️ ${tabelaPrecos.espelhos.especiais}

Me manda as medidas (altura x largura) que calculo certinho!
Exemplo: "espelho 4mm bisotado 1,5 x 2"`;
    }
    
    // VIDROS COMUNS
    if (msg.includes('vidro comum') || (msg.includes('vidro') && !msg.includes('temperado') && !msg.includes('espelho'))) {
        const dimensoes = extrairDimensoes(mensagem);
        
        // Identificar tipo de vidro
        let tipoVidro = null;
        let descricao = '';
        
        if (msg.includes('fumê') && msg.includes('4mm') || msg.includes('fume') && msg.includes('4mm')) {
            tipoVidro = 'fume_4mm';
            descricao = 'Fumê 4mm';
        } else if (msg.includes('incolor') && msg.includes('4mm')) {
            tipoVidro = 'incolor_4mm';
            descricao = 'Incolor 4mm';
        } else if (msg.includes('incolor') || msg.includes('3mm')) {
            tipoVidro = 'incolor_3mm';
            descricao = 'Incolor 3mm';
        } else if (msg.includes('mine') || msg.includes('boreal')) {
            tipoVidro = 'mine_boreal';
            descricao = 'Mine-boreal';
        } else if (msg.includes('canelado')) {
            tipoVidro = 'canelado';
            descricao = 'Canelado';
        } else if (msg.includes('fumê') || msg.includes('fume')) {
            tipoVidro = 'fume_3mm';
            descricao = 'Fumê 3mm';
        }
        
        if (dimensoes && tipoVidro) {
            const area = dimensoes.largura * dimensoes.altura;
            const precoBase = area * tabelaPrecos.vidrosComuns[tipoVidro];
            const precoComInstalacao = (precoBase * (1 + tabelaPrecos.vidrosComuns.instalacao)).toFixed(2);
            const precoSemInstalacao = precoBase.toFixed(2);
            
            return `🔸 ORÇAMENTO ${descricao.toUpperCase()} (${dimensoes.largura}x${dimensoes.altura}m = ${area.toFixed(2)}m²):

💰 **Com instalação:** R$ ${precoComInstalacao}
🏪 **Se buscar na loja:** R$ ${precoSemInstalacao} (sem cobrança de instalação)

Inclui corte nas medidas.
Precisa do seu endereço para confirmar!`;
        }
        
        return `🔸 VIDROS COMUNS:

**R$ 200/m² + 10% instalação:**
• Incolor 3mm
• Mine-boreal  
• Canelado

**R$ 220/m² + 10% instalação:**
• Incolor 4mm
• Fumê 3mm

**R$ 240/m² + 10% instalação:**
• Fumê 4mm

💡 **Se buscar na loja:** Sem cobrança de instalação!

⚠️ ${tabelaPrecos.vidrosComuns.especiais}

Me manda o tipo e medidas (altura x largura)!
Exemplo: "vidro fumê 4mm 1,5 x 2"`;
    }
    
    // BOXES
    if (msg.includes('box')) {
        if (msg.includes('manutenção') || msg.includes('conserto') || msg.includes('reparo')) {
            return `🔧 MANUTENÇÃO DE BOX:

💰 **Opções de serviço:**

🔹 **${tabelaPrecos.manutencaoBox.desc_simples}**
• Vedação com silicone

🔹 **${tabelaPrecos.manutencaoBox.desc_media}**
• Troca de roldanas
• Regulagem completa

🔹 **${tabelaPrecos.manutencaoBox.desc_completa}**
• Troca de roldanas
• Regulagem completa
• Aplicação de silicone

👨‍🔧 **Especialistas em manutenção:** ${infoEmpresa.funcionarios.manutencao.join(' e ')}

Qual problema você está tendo no box?
Precisa do seu endereço para agendar a visita!`;
        }
        
        // Verificar se cliente mencionou largura
        const largura = extrairLarguraBox(mensagem);
        if (largura) {
            // Detectar tipo de vidro
            const ehFume = msg.includes('fumê') || msg.includes('fume');
            const tipoBox = ehFume ? 'fume_8mm' : 'incolor_8mm';
            const descricaoVidro = ehFume ? 'fumê' : 'incolor';
            
            const area = largura * 2; // altura sempre 2m
            const precoTotal = (area * tabelaPrecos.boxes[tipoBox].preco_por_metro).toFixed(2);
            
            return `🚿 ORÇAMENTO BOX ${descricaoVidro.toUpperCase()} (${largura}m x 2m = ${area}m²):

💰 **Vidro 8mm temperado:** R$ ${precoTotal}

📦 **PRONTA ENTREGA:**
• Vidros: ${tabelaPrecos.boxes.pronta_entrega.vidros.join(', ')}
• Alumínio: ${tabelaPrecos.boxes.pronta_entrega.aluminios.join(', ')}

⚠️ ${tabelaPrecos.boxes.especial}

Qual cor de alumínio você prefere?`;
        }
        
        return `🚿 BOX DE CORRER - Vidro 8mm temperado (altura padrão 2m):

📦 **PRONTA ENTREGA:**
• Vidros: ${tabelaPrecos.boxes.pronta_entrega.vidros.join(', ')}
• Alumínio: ${tabelaPrecos.boxes.pronta_entrega.aluminios.join(', ')}

⚠️ ${tabelaPrecos.boxes.especial}

Me manda a largura do seu box que faço o orçamento!
Exemplo: "box fumê 1,20m"`;
    }
    
    // JANELAS PADRÃO
    if (msg.includes('janela') && (msg.includes('120') || msg.includes('150') || msg.includes('padrão') || msg.includes('padrao'))) {
        // Verificar se menciona múltiplas janelas
        const multiplaJanelas = msg.includes('janelas') || 
                              /\d+\s*janela/i.test(msg) || 
                              msg.includes('várias') || 
                              msg.includes('muitas');
        
        // Extrair quantidade se mencionada
        const quantidadeMatch = msg.match(/(\d+)\s*janela/i);
        const quantidade = quantidadeMatch ? parseInt(quantidadeMatch[1]) : null;
        
        let resposta = `🪟 JANELAS PADRÃO:

**120x100cm:**
• Incolor: R$ ${tabelaPrecos.janelasPadrao['120x100_incolor']}
• Fumê: R$ ${tabelaPrecos.janelasPadrao['120x100_fume']}

**150x100cm:**
• Incolor: R$ ${tabelaPrecos.janelasPadrao['150x100_incolor']}
• Fumê: R$ ${tabelaPrecos.janelasPadrao['150x100_fume']}

${tabelaPrecos.janelasPadrao.desc}`;

        if (multiplaJanelas) {
            if (quantidade && quantidade > 1) {
                // Calcular valores totais
                const total120Incolor = (quantidade * tabelaPrecos.janelasPadrao['120x100_incolor']).toFixed(2);
                const total120Fume = (quantidade * tabelaPrecos.janelasPadrao['120x100_fume']).toFixed(2);
                const total150Incolor = (quantidade * tabelaPrecos.janelasPadrao['150x100_incolor']).toFixed(2);
                const total150Fume = (quantidade * tabelaPrecos.janelasPadrao['150x100_fume']).toFixed(2);
                
                resposta += `

📊 **PARA ${quantidade} JANELAS:**

**120x100cm:**
• Incolor: R$ ${total120Incolor}
• Fumê: R$ ${total120Fume}

**150x100cm:**
• Incolor: R$ ${total150Incolor}
• Fumê: R$ ${total150Fume}

💰 ${tabelaPrecos.janelasPadrao.observacao}`;
            } else {
                resposta += `

💰 ${tabelaPrecos.janelasPadrao.observacao}

Quantas janelas você precisa? Posso calcular o valor total!`;
            }
