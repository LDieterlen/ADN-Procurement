// Options of the extension: where the local API answers, and the token shown on FFE's settings page.
const FIELDS = ['baseUrl', 'webUrl', 'token']
const DEFAULTS = { baseUrl: 'http://localhost:8000', webUrl: 'http://localhost:5180', token: '' }

async function load() {
  const stored = { ...DEFAULTS, ...(await chrome.storage.local.get(FIELDS)) }
  for (const key of FIELDS) document.getElementById(key).value = stored[key]
}

document.getElementById('save').addEventListener('click', async () => {
  const values = {}
  for (const key of FIELDS) values[key] = document.getElementById(key).value.trim().replace(/\/+$/, '')
  if (!values.baseUrl) values.baseUrl = DEFAULTS.baseUrl
  if (!values.webUrl) values.webUrl = DEFAULTS.webUrl
  await chrome.storage.local.set(values)
  document.getElementById('status').textContent = 'Enregistré.'
})

load()
