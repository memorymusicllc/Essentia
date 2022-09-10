const { Storage } = require('@google-cloud/storage')
let service_key = JSON.parse(process?.env?.service_key || '{}')

const projectId = service_key?.project_id

const storage = new Storage({ projectId, credentials: service_key })

module.exports = {
    storage,
    projectId,
    service_key  
}
