// « Envoyer à FFE » (ADR-0017): reads the page the tab displays (the browser has passed the site's
// bot checks and holds the session), posts it to the local API with the shared token, then sends
// the photos itself when the server could not download them (every photo of the page). Nothing else leaves the browser.
const page = document.getElementById('page')
const status = document.getElementById('status')
const send = document.getElementById('send')

const DEFAULTS = { baseUrl: 'http://localhost:8000', webUrl: 'http://localhost:5180', token: '' }

async function options() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) }
}

function say(text, kind) {
  status.textContent = text
  status.className = kind || ''
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

/** Runs in the page: the URL without its fragment and the DOM as displayed. */
function readPage() {
  return { url: location.href.split('#')[0], html: document.documentElement.outerHTML }
}

async function postCapture(opts, url, html) {
  const body = new FormData()
  body.set('url', url)
  // As a file part: Starlette caps a plain form field at 1 Mo, a rendered page is often bigger.
  body.set('html', new Blob([html], { type: 'text/html' }), 'page.html')
  const response = await fetch(`${opts.baseUrl}/api/v1/captures`, { method: 'POST', body, headers: { 'X-FFE-Token': opts.token } })
  const json = await response.json().catch(() => null)
  if (!response.ok) throw new Error((json && (json.message || json.detail)) || `FFE répond ${response.status}.`)
  return json
}

/** Every photo of the page the server could not download (protected CDN): fetched here, with the
 * browser's session, and appended to the capture. Returns the capture as it stands after. */
async function sendMissingImages(opts, capture) {
  const have = new Set(capture.images.map((image) => image.sourceUrl))
  const missing = (capture.preview.imageUrls || []).filter((url) => !have.has(url))
  for (const imageUrl of missing) {
    try {
      const picture = await fetch(imageUrl, { credentials: 'include' })
      if (!picture.ok) continue
      const blob = await picture.blob()
      if (blob.size > 3 * 1024 * 1024) continue
      const body = new FormData()
      body.set('image', blob, imageUrl.split('/').pop().split('?')[0] || 'image')
      body.set('url', imageUrl)
      const response = await fetch(`${opts.baseUrl}/api/v1/captures/${capture.id}/image`, { method: 'POST', body, headers: { 'X-FFE-Token': opts.token } })
      if (response.ok) capture = await response.json()
    } catch {
      // one photo less; the others still go
    }
  }
  return capture
}

async function main() {
  const tab = await activeTab()
  page.textContent = tab && tab.url ? tab.url : 'Aucune page.'
  const opts = await options()
  if (!opts.token) say('Jeton absent : le copier depuis Réglages de FFE dans les options.', 'error')
  send.addEventListener('click', async () => {
    send.disabled = true
    say('Lecture de la page…')
    try {
      if (!tab || !tab.id || !/^https?:/.test(tab.url || '')) throw new Error('Cette page ne peut pas être lue.')
      const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readPage })
      say('Envoi à FFE…')
      let capture = await postCapture(opts, result.url, result.html)
      capture = await sendMissingImages(opts, capture)
      const count = capture.images.length
      say(`« ${capture.preview.name} » envoyé ${count > 1 ? `avec ${count} photos` : count ? 'avec sa photo' : '(sans photo)'} : à retrouver sur « Nouvel article ».`, 'ok')
    } catch (error) {
      say(error && error.message ? error.message : String(error), 'error')
    } finally {
      send.disabled = false
    }
  })
  document.getElementById('options').addEventListener('click', (event) => {
    event.preventDefault()
    chrome.runtime.openOptionsPage()
  })
  document.getElementById('open').addEventListener('click', (event) => {
    event.preventDefault()
    chrome.tabs.create({ url: `${opts.webUrl}/projects` })
  })
}

main()
