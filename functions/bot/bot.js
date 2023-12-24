const https = require('https');
const { Telegraf, Markup } = require("telegraf");
const axios = require('axios')
const cheerio = require('cheerio')

const bot = new Telegraf(process.env.BOT_TOKEN)

// FUNCIONES A MOVER
function removeTextSigns(text) {
  let modifiedText = text.replace(/-/g, ' ')
  modifiedText = modifiedText.charAt(0).toUpperCase() + modifiedText.slice(1)
  return modifiedText
}

const cines = Markup.inlineKeyboard([
  // 1-st column
  [Markup.button.callback('Aragonia', 'aragonia'), Markup.button.callback('Palafox', 'palafox')],
  // 2nd column
  [Markup.button.callback('Cinesa (Gran Casa)', 'grancasa'), Markup.button.callback('Cinesa (P. Venecia)', 'pvenecia')],
  // 3rd column
  [Markup.button.callback('Arte 7', 'arte7')]
]);

// Comando /start
bot.start((ctx) => {
  ctx.reply("¡Hola! Para ver la cartelera, usa el comando /cartelera");
})

// Comando /cartelera
bot.command('cartelera', (ctx) => {
  ctx.reply('¿Qué cine?', cines);
})

bot.action(['aragonia', 'palafox', 'grancasa', 'pvenecia', 'arte7'], async (ctx) => {
  // ctx.match contiene el callback_data del botón presionado
  const cineSeleccionado = ctx.match[0];

  switch (cineSeleccionado) {
    case 'aragonia':
      // OBTENEMOS LOS TITULOS DE LA CARTELERA
      const response = await axios.get('https://www.cinespalafox.com/cartelera.html', {
        httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Desactiva la verificación del certificado
      });
      const $ = cheerio.load(response.data);

      // Obtener los títulos de la cartelera
      const cartelera = $('.caption h2').map((index, element) => $(element).text().toLowerCase()).get();

      // Obtener los enlaces de la cartelera
      const linksCartelera = $('.field-content a').map((index, element) => $(element).attr('href')).get();
      linksCartelera.shift(); // Eliminar el primer elemento (no necesario según tu lógica)

      // Crear un objeto con los títulos como clave y los enlaces como valor
      const carteleraObject = {};
      cartelera.forEach((item, index) => {
        carteleraObject[item] = linksCartelera[index] || null;
      });


      // Agrupar los botones en arrays para 2 columnas
      const buttonsPerColumn = 2;
      const buttonColumns = [];
      for (let i = 0; i < cartelera.length; i += buttonsPerColumn) {
        const columnKeys = cartelera.slice(i, i + buttonsPerColumn);
        const columnButtons = columnKeys.map(key => {
          // Aplicar la expresión regular para extraer el valor entre "cartelera/" y ".html"
          const match = carteleraObject[key].match(/\/cartelera\/(.+?)\.html/);
          // Usar el valor extraído como value en el botón
          const value = match && match[1]
      
          // Crear el botón con el valor modificado
          return Markup.button.callback(key, value);
        });
      
        buttonColumns.push(columnButtons);
      }

      const inlineKeyboard = Markup.inlineKeyboard(buttonColumns);
      ctx.editMessageText("Selecciona una opción:", inlineKeyboard);

      break;
    case 'palafox':
      ctx.editMessageText('Palafox seleccionado');
      break;
    case 'grancasa':
      ctx.editMessageText('Cinesa (Gran Casa) seleccionado');
      break;
    case 'pvenecia':
      ctx.editMessageText('Cinesa (P. Venecia) seleccionado');
      break;
    case 'arte7':
      ctx.editMessageText('Arte 7 seleccionado');
      break;
    default:
      ctx.editMessageText('Opción no reconocida');
  }
});

//Leemos las peliculas con el link
bot.action(/^(?!.*\.html).*$/, async (ctx) => {
  const URL = `https://www.cinespalafox.com/cartelera/${ctx.match[0]}.html`
  // OBTENEMOS LOS TITULOS DE LA CARTELERA
  const response = await axios.get(URL, {
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Desactiva la verificación del certificado
  });
  const $ = cheerio.load(response.data);
  
  const aragoniaDiv = $('.sesiones h3:contains("Cines aragonia")').parent();
  const primerUl = aragoniaDiv.find('ul').first();

  const horariosData = {};
  // Iterar sobre los elementos li dentro de ul
  primerUl.find('> li').each((index, liElement) => {
    const fecha = $(liElement).text();
    // Obtener los textos dentro de los elementos a que están al mismo nivel que li
    const textos = $(liElement).next('ul').find('li a').map((index, aElement) => $(aElement).text()).get();

    horariosData[fecha] = textos;
  });

  let renderHorario = '';
  renderHorario += `${removeTextSigns(ctx.match[0])}\n`
  for (const fecha in horariosData) {
    renderHorario += `${fecha}:\n`;
    horariosData[fecha].forEach(horario => {
      renderHorario += `  ·${horario}\n`;
    });
    renderHorario += '\n';
  }
  ctx.editMessageText(renderHorario)
})

// AWS event handler syntax (https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html)
exports.handler = async event => {
  try {
    await bot.handleUpdate(JSON.parse(event.body))
    return { statusCode: 200, body: "" }
  } catch (e) {
    console.error("error in handler:", e)
    return { statusCode: 400, body: "This endpoint is meant for bot and telegram communication" }
  }
}