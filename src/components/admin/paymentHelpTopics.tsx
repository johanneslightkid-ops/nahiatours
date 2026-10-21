import React from 'react';
import { HelpTopic } from './PaymentHelpTour';

/**
 * What the payments help tour says, per processor. Each step's `target` is
 * the `data-help` attribute on its field in PaymentSettingsPanel.
 *
 * AZUL, CardNET and MIO have no self-service page that shows these values:
 * the bank or MIO hands them over when the e-commerce affiliation is signed.
 * Their steps say so and link to where to ask.
 */

export type HelpTopicId = 'stripe' | 'azul' | 'cardnet' | 'verifone' | 'paypal' | 'mio';

const BCRD_RATE = { label: 'Tasa del dólar del Banco Central', url: 'https://www.bancentral.gov.do/a/d/2538-mercado-cambiario' };

export const PAYMENT_HELP: Record<HelpTopicId, HelpTopic> = {
  stripe: {
    title: 'Stripe',
    intro: (
      <>
        <p>
          1. Inicia sesión en tu cuenta de Stripe (o créala). Para cobrar de verdad, la cuenta tiene que estar
          activada: Stripe te pide los datos del negocio y la cuenta bancaria donde recibir el dinero.
        </p>
        <p>
          2. Arriba a la derecha del panel de Stripe está el interruptor <strong>«Modo de prueba»</strong>.
          Encendido ves las claves <code>sk_test_…</code>; apagado, las reales <code>sk_live_…</code>.
        </p>
      </>
    ),
    introLinks: [
      { label: 'Iniciar sesión en Stripe', url: 'https://dashboard.stripe.com/login' },
      { label: 'Activar la cuenta para cobrar', url: 'https://dashboard.stripe.com/account/onboarding' },
    ],
    steps: [
      {
        target: 'stripe.secret',
        title: 'Clave secreta',
        body: (
          <>
            <p>
              En <em>Desarrolladores → Claves de API</em>, junto a «Clave secreta», pulsa <strong>«Revelar clave»</strong> y
              cópiala entera. Empieza por <code>sk_live_</code> (real) o <code>sk_test_</code> (pruebas).
            </p>
            <p>No uses la «clave publicable» (<code>pk_…</code>): esa no sirve aquí.</p>
          </>
        ),
        link: { label: 'Claves de API (modo real)', url: 'https://dashboard.stripe.com/apikeys' },
      },
      {
        target: 'stripe.currency',
        title: 'Moneda',
        body: (
          <p>
            El código de tres letras de la moneda en que cobra Stripe: <code>USD</code> para dólares. Los precios del
            catálogo ya están en dólares, así que normalmente es USD.
          </p>
        ),
      },
      {
        target: 'stripe.save',
        title: 'Guardar',
        body: (
          <p>
            Pulsa «Guardar». La etiqueta pasará a <strong>lista</strong> e indicará si es modo real o de pruebas. Para
            probar sin cobrar, usa una clave <code>sk_test_</code> y la tarjeta 4242 4242 4242 4242.
          </p>
        ),
        link: { label: 'Tarjetas de prueba de Stripe', url: 'https://docs.stripe.com/testing' },
      },
    ],
  },

  azul: {
    title: 'AZUL',
    intro: (
      <>
        <p>
          AZUL (Banco Popular) no muestra estos datos en una página web: te los entrega al firmar la afiliación de 
          <strong>comercio electrónico</strong> (no basta con tener un POS físico).
        </p>
        <p>
          1. Pide a tu ejecutivo de AZUL la <strong>«Página de Pagos»</strong>. Te enviarán por correo dos juegos de
          datos: uno de pruebas y otro de producción.
        </p>
        <p>2. Rellena aquí el juego que corresponda al modo elegido («Pruebas» o «Real»).</p>
      </>
    ),
    introLinks: [
      { label: 'AZUL · afiliación de comercio', url: 'https://www.azul.com.do' },
      { label: 'AZUL · documentación para desarrolladores', url: 'https://dev.azul.com.do' },
      BCRD_RATE,
    ],
    steps: [
      {
        target: 'banks.rate',
        title: 'Tasa: pesos por dólar',
        body: (
          <p>
            Cuántos pesos se cobran por cada dólar del catálogo, si el banco cobra en pesos. Usa la tasa de venta del
            día del Banco Central o la de tu banco, por ejemplo <code>60.50</code>.
          </p>
        ),
        link: BCRD_RATE,
      },
      {
        target: 'banks.itbis',
        title: 'ITBIS incluido',
        body: <p>El porcentaje de ITBIS que ya llevan tus precios: 18 normalmente, 0 si el negocio está exento. Pregúntale a tu contador si dudas.</p>,
      },
      {
        target: 'azul.merchantId',
        title: 'AZUL · Merchant ID',
        body: <p>El número de comercio (11 dígitos) que figura en el correo de AZUL con los datos de la Página de Pagos. Es distinto en pruebas y en producción.</p>,
        link: { label: 'Página de Pagos de AZUL', url: 'https://dev.azul.com.do' },
      },
      {
        target: 'azul.merchantName',
        title: 'AZUL · Nombre del comercio',
        body: <p>Escríbelo exactamente como lo registró AZUL (está en el mismo correo). Es el nombre que verá el cliente en la página de pago.</p>,
      },
      {
        target: 'azul.merchantType',
        title: 'AZUL · Tipo de comercio',
        body: <p>Viene en el correo de AZUL; casi siempre es <code>ECommerce</code>.</p>,
      },
      {
        target: 'azul.currencyCode',
        title: 'AZUL · Código de moneda',
        body: <p>El símbolo que AZUL indicó para tu afiliación: <code>$</code> para pesos dominicanos.</p>,
      },
      {
        target: 'azul.currency',
        title: 'AZUL · Cobra en',
        body: <p>La moneda en que está afiliado tu comercio. Si es en pesos, se usa la tasa del paso 1.</p>,
      },
      {
        target: 'azul.authKey',
        title: 'AZUL · AuthKey',
        body: (
          <p>
            La clave de autenticación (una cadena larga) del mismo correo. Firma cada pago y se queda en el servidor:
            después de guardarla no se vuelve a mostrar. Si no la tienes, pídesela a AZUL.
          </p>
        ),
      },
      {
        target: 'azul.save',
        title: 'Guardar',
        body: <p>Pulsa «Guardar AZUL». Con todos los datos, la etiqueta pasa a <strong>lista</strong>. Prueba primero en modo «Pruebas».</p>,
      },
    ],
  },

  cardnet: {
    title: 'CardNET',
    intro: (
      <>
        <p>
          CardNET no muestra estos datos en una página web: te los entrega al firmar la afiliación de 
          <strong>comercio electrónico</strong> (no basta con tener un POS físico).
        </p>
        <p>
          1. Pide a tu ejecutivo de CardNET el <strong>«Botón de Pago»</strong>. Te enviarán por correo los datos de
          pruebas y los de producción.
        </p>
        <p>2. Para probar antes de tenerlos, elige «Pruebas» y usa el botón de los datos públicos del laboratorio.</p>
      </>
    ),
    introLinks: [
      { label: 'CardNET · afiliación de comercio', url: 'https://www.cardnet.com.do' },
      BCRD_RATE,
    ],
    steps: [
      {
        target: 'banks.rate',
        title: 'Tasa: pesos por dólar',
        body: (
          <p>
            Cuántos pesos se cobran por cada dólar del catálogo, si el banco cobra en pesos. Usa la tasa de venta del
            día del Banco Central o la de tu banco, por ejemplo <code>60.50</code>.
          </p>
        ),
        link: BCRD_RATE,
      },
      {
        target: 'banks.itbis',
        title: 'ITBIS incluido',
        body: <p>El porcentaje de ITBIS que ya llevan tus precios: 18 normalmente, 0 si el negocio está exento. Pregúntale a tu contador si dudas.</p>,
      },
      {
        target: 'cardnet.merchantNumber',
        title: 'CardNET · Número de afiliado',
        body: (
          <p>
            El número de comercio que CardNET te asignó para el Botón de Pago (empieza por <code>349</code>). En modo
            «Pruebas» puedes usar el botón de los datos públicos del laboratorio.
          </p>
        ),
        link: { label: 'CardNET', url: 'https://www.cardnet.com.do' },
      },
      {
        target: 'cardnet.terminal',
        title: 'CardNET · Terminal',
        body: <p>El número de terminal virtual de 8 dígitos que viene con la afiliación.</p>,
      },
      {
        target: 'cardnet.mcc',
        title: 'CardNET · Categoría (MCC)',
        body: <p>El código de 4 cifras del tipo de negocio que figura en la afiliación. Para agencias de viaje y tours suele ser <code>4722</code>.</p>,
      },
      {
        target: 'cardnet.currency',
        title: 'CardNET · Cobra en',
        body: <p>La moneda de tu afiliación con CardNET. En pesos se usa la tasa del paso 1.</p>,
      },
      {
        target: 'cardnet.merchantName',
        title: 'CardNET · Nombre del comercio',
        body: <p>Tal como lo registró CardNET, hasta 40 caracteres en mayúsculas: nombre, ciudad y país (<code>DO</code>).</p>,
      },
      {
        target: 'cardnet.save',
        title: 'Guardar',
        body: <p>Pulsa «Guardar CardNET». Con todos los datos, la etiqueta pasa a <strong>lista</strong>. Prueba primero en modo «Pruebas».</p>,
      },
    ],
  },

  verifone: {
    title: 'Verifone · 2Checkout',
    intro: (
      <>
        <p>
          1. Inicia sesión en el panel de comerciante de 2Checkout (Verifone). Si aún no tienes cuenta, créala y
          espera a que la aprueben.
        </p>
        <p>
          2. Ve a <em>Integrations → Webhooks &amp; API</em>. Ahí están los dos datos que necesitas.
        </p>
        <p>
          3. En la misma cuenta, comprueba que los <strong>productos dinámicos</strong> («dynamic products») están
          activados; si no, pídeselo al soporte de 2Checkout.
        </p>
      </>
    ),
    introLinks: [
      { label: 'Iniciar sesión en 2Checkout', url: 'https://secure.2checkout.com/cpanel/login.php' },
      { label: 'Integrations → Webhooks & API', url: 'https://secure.2checkout.com/cpanel/webhooks_api.php' },
    ],
    steps: [
      {
        target: 'verifone.code',
        title: 'Merchant Code',
        body: <p>En <em>Webhooks &amp; API</em>, sección «API», copia el <strong>Merchant Code</strong> (un número largo).</p>,
        link: { label: 'Webhooks & API', url: 'https://secure.2checkout.com/cpanel/webhooks_api.php' },
      },
      {
        target: 'verifone.secret',
        title: 'Buy-Link Secret Word',
        body: (
          <p>
            En la misma página, sección «Secret word», copia la <strong>Buy-link secret word</strong> (no la «INS
            secret word»). Se guarda solo en el servidor.
          </p>
        ),
        link: { label: 'Webhooks & API', url: 'https://secure.2checkout.com/cpanel/webhooks_api.php' },
      },
      {
        target: 'verifone.currency',
        title: 'Moneda del cobro',
        body: <p>La moneda en que quieres cobrar. Tiene que estar activada en tu cuenta de 2Checkout.</p>,
      },
      {
        target: 'verifone.save',
        title: 'Guardar',
        body: <p>Pulsa «Guardar Verifone». En «Pruebas» los pedidos se marcan como prueba; cambia a «Real» cuando un pago de prueba haya funcionado.</p>,
      },
    ],
  },

  paypal: {
    title: 'PayPal',
    intro: (
      <>
        <p>
          1. Necesitas una cuenta PayPal <strong>Business</strong>. Inicia sesión con ella en el portal de
          desarrolladores de PayPal.
        </p>
        <p>
          2. Arriba hay un interruptor <em>Sandbox / Live</em>: Sandbox para pruebas, Live para cobrar. Cada uno
          tiene sus propias credenciales; usa el mismo modo que elijas aquí.
        </p>
        <p>
          3. En <em>Apps &amp; Credentials</em> pulsa <strong>«Create App»</strong>, ponle un nombre (por ejemplo, el
          de tu sitio) y créala como «Merchant».
        </p>
      </>
    ),
    introLinks: [
      { label: 'Apps & Credentials · Live', url: 'https://developer.paypal.com/dashboard/applications/live' },
      { label: 'Apps & Credentials · Sandbox', url: 'https://developer.paypal.com/dashboard/applications/sandbox' },
    ],
    steps: [
      {
        target: 'paypal.clientId',
        title: 'Client ID',
        body: <p>Abre la app que creaste y copia el <strong>Client ID</strong> (empieza a menudo por <code>A</code>).</p>,
        link: { label: 'Apps & Credentials · Live', url: 'https://developer.paypal.com/dashboard/applications/live' },
      },
      {
        target: 'paypal.secret',
        title: 'Secret',
        body: <p>Debajo, en «Secret key 1», pulsa el ojo para mostrarlo y cópialo. Se queda en el servidor.</p>,
      },
      {
        target: 'paypal.save',
        title: 'Guardar',
        body: <p>Elige arriba «Pruebas» (Sandbox) o «Real» (Live) según de dónde copiaste los datos, y pulsa «Guardar PayPal».</p>,
      },
    ],
  },

  mio: {
    title: 'MIO',
    intro: (
      <>
        <p>
          1. Necesitas una cuenta de comercio en MIO. Las credenciales de la <strong>«API Checkout»</strong> no se
          ven en la app: te las entrega tu asesor de negocios de MIO cuando la activas.
        </p>
        <p>
          2. Pídele a tu asesor: <em>client ID, client secret, número de comercio y la dirección del token</em>, para
          pruebas y para producción.
        </p>
        <p>
          3. Si solo tienes un link de pago Milin, pégalo abajo en «Link de pago MIO (Milin)»; funciona sin estas
          credenciales, pero no confirma el pago automáticamente.
        </p>
      </>
    ),
    introLinks: [
      { label: 'MIO · comercios', url: 'https://www.mio.com.do' },
      BCRD_RATE,
    ],
    steps: [
      {
        target: 'mio.clientId',
        title: 'Client ID',
        body: <p>El identificador de la aplicación que te dio MIO al activar la API Checkout.</p>,
      },
      {
        target: 'mio.secret',
        title: 'Client secret',
        body: <p>La clave que acompaña al client ID. Se guarda solo en el servidor y no se vuelve a mostrar.</p>,
      },
      {
        target: 'mio.merchantId',
        title: 'Número de comercio',
        body: <p>El número de tu comercio en MIO (merchant ID), también del correo de tu asesor.</p>,
      },
      {
        target: 'mio.currency',
        title: 'Moneda del cobro',
        body: <p>Normalmente pesos (DOP). En pesos hace falta la «Tasa de cambio e ITBIS» de más arriba.</p>,
        link: BCRD_RATE,
      },
      {
        target: 'mio.authUrl',
        title: 'Dirección del token',
        body: <p>La URL de autenticación que te indicó MIO, empieza por <code>https://</code> y suele terminar en <code>/oauth/token</code>.</p>,
      },
      {
        target: 'mio.apiBase',
        title: 'Dirección de la API (opcional)',
        body: <p>Déjala vacía salvo que MIO te dé una distinta: se usa la de pruebas o la de producción según el modo.</p>,
      },
      {
        target: 'mio.save',
        title: 'Guardar',
        body: (
          <p>
            Pulsa «Guardar MIO». Cuando esté <strong>lista</strong>, puedes además elegir MIO como procesador de
            tarjetas arriba, en «Procesador de tarjetas».
          </p>
        ),
      },
    ],
  },
};
