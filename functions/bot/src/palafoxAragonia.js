const { Markup } = require("telegraf");
const https = require('https');
const axios = require('axios')
const cheerio = require('cheerio')
const funciones = require("./funciones.js")

async function cartelera(ctx){
  // OBTENEMOS LOS TITULOS DE LA CARTELERA
  const response = await axios.get('https://www.cinespalafox.com/cartelera.html', {
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Desactiva la verificación del certificado
  });
  const $ = cheerio.load(response.data);

  // Obtener los títulos de la cartelera
  const cartelera = $('.caption h2').map((index, element) => $(element).text().toLowerCase()).get()

  // Obtener los enlaces de la cartelera
  const linksCartelera = $('.field-content a').map((index, element) => $(element).attr('href')).get()
  linksCartelera.shift(); // Eliminar el primer elemento (no necesario según tu lógica)

  // Crear un objeto con los títulos como clave y los enlaces como valor
  const carteleraObject = {}
  cartelera.forEach((item, index) => {
    carteleraObject[item] = linksCartelera[index] || null
  })

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
      return Markup.button.callback(funciones.removeTextSigns(key), value)
    });

    buttonColumns.push(columnButtons)
  }

  const inlineKeyboard = Markup.inlineKeyboard(buttonColumns)
  ctx.editMessageText("Selecciona una opción:", inlineKeyboard)
}

//Función para mostrar los horarios de las peliculas
async function horario(ctx, cineSeleccionadoGlobal){
  const cineSeleccionado = cineSeleccionadoGlobal
  const URL = `https://www.cinespalafox.com/cartelera/${ctx.match[0]}.html`
  // OBTENEMOS LOS TITULOS DE LA CARTELERA
  const response = await axios.get(URL, {
    httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Desactiva la verificación del certificado
  });
  const $ = cheerio.load(response.data);
  
  const cineDiv = $(`.sesiones h3:contains("Cines ${cineSeleccionado === "aragonia" ? "aragonia" : "Palafox"}")`).parent();
  const primerUl = cineDiv.find('ul').first();

  const horariosData = {};
  // Iterar sobre los elementos li dentro de ul
  primerUl.find('> li').each((index, liElement) => {
    const fecha = $(liElement).text();
    // Obtener los textos dentro de los elementos a que están al mismo nivel que li
    const textos = $(liElement).next('ul').find('li a').map((index, aElement) => $(aElement).text()).get();

    horariosData[fecha] = textos;
  });

  let renderHorario = '';
  renderHorario += `${funciones.removeTextSigns(ctx.match[0]).toUpperCase()}\n`
  if(Object.keys(horariosData).length !== 0){
    for (const fecha in horariosData) {
      renderHorario += `${fecha}:\n`;
      horariosData[fecha].forEach(horario => {
        renderHorario += `  ·${horario}\n`;
      });
      renderHorario += '\n';
    }
  } else {
    renderHorario += "No hay horarios para este cine"
  }

  ctx.editMessageText(`Aqui tienes los horarios para Cines ${cineSeleccionado}`)
  ctx.reply(renderHorario)
}

module.exports = { cartelera, horario }
