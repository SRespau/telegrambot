const https = require('https');
const { Telegraf, Markup } = require("telegraf");
const axios = require('axios')
const cheerio = require('cheerio')
const puppeteer = require('puppeteer')

//Funciones
const palafoxAragonia = require("./src/palafoxAragonia.js")
const funciones = require("./src/funciones.js")

//Constantes
const bot = new Telegraf(process.env.BOT_TOKEN)

const cines = Markup.inlineKeyboard([
  // 1-st column
  [Markup.button.callback('Aragonia', 'aragonia'), Markup.button.callback('Palafox', 'palafox')],
  // 2nd column
  [Markup.button.callback('Cinesa (Gran Casa)', 'grancasa'), Markup.button.callback('Cinesa (P. Venecia)', 'pvenecia')],
  // 3rd column
  [Markup.button.callback('Arte 7', 'arte7')]
]);

//Variables globales
let cineSeleccionadoGlobal = null

// PUPPETEER PARA CINESA PVENECIA (MOVER A FICHERO A PARTE)
async function clickSeeMoreButtons() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navegar a la página
  await page.goto('https://www.filmaffinity.com/es/theater-showtimes.php?id=530', {waitUntil: 'load'});
  // Aceptamos las cookies
  const acceptCookiesButton = await page.$('[class=" css-v43ltw"]')
  if (acceptCookiesButton) {
    if (acceptCookiesButton) {
      await acceptCookiesButton.click();
    }
  }
  // Seleccionar y hacer clic en todos los botones con la clase "see-more"
  await page.waitForSelector('.see-more', { visible: true });
  const seeMoreButtons = await page.$$('[class="see-more"]');
  for (const button of seeMoreButtons) { 
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 100)) 
  }  
  // Obtener el HTML actualizado después de hacer clic en los botones
  const updatedHTML = await page.content()

  // Usar Cheerio para analizar el HTML actualizado
  const $ = cheerio.load(updatedHTML)
  let titles = $('.mv-title')
  titles.each((index, element) => {
    // Obtener todos los nodos hijos, incluidos elementos y nodos de texto
    const childNodes = $(element).contents()
  
    // Filtrar los nodos de texto
    const textNodes = childNodes.filter(function() {
      return this.nodeType === 3; // Node.TEXT_NODE
    })
  
    // Recorrer los nodos de texto y mostrar su contenido
    textNodes.each((index, textNode) => {
      const textContent = textNode.nodeValue.trim();
      if (textContent !== "") {
        console.log(textContent);
      }
    });
  });
    // Extraer todos los li directos de la lista ul con clase ".sessions"
  const sessionsLi = $('.sessions > li');

  // Iterar sobre los li y mostrar su texto en la consola
  sessionsLi.each((index, element) => {
    const dataSessDate = $(element).attr('data-sess-date');
    console.log(dataSessDate);
  });

  // Cerrar el navegador
  await browser.close();
}
/////


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
  cineSeleccionadoGlobal = cineSeleccionado
  
  switch (cineSeleccionado) {
    case 'aragonia':
    case 'palafox':
      palafoxAragonia.cartelera(ctx)
      break;
    case 'grancasa':
      ctx.editMessageText('Cinesa (Gran Casa) seleccionado');
      break;
    case 'pvenecia':
      clickSeeMoreButtons()
      break;
    case 'arte7':
      ctx.editMessageText('Arte 7 seleccionado');
      break;
    default:
      ctx.editMessageText('Opción no reconocida');
  }
});

//Leemos las peliculas de Aragonia y Palafox con el link
bot.action(/^(?!.*\.html).*$/, (ctx) => {
  palafoxAragonia.horario(ctx, cineSeleccionadoGlobal)
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