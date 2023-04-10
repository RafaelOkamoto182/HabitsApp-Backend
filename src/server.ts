//API RESTful
//

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { appRoutes } from './routes'

const app = Fastify()

/* Método HTTP: Get, Post, Put, Patch, Delete */
/* Put vs Patch: Put atualiza um recurso por completo. Patch atualiza partes desse recurso */

app.register(cors) //Dessa forma qualquer app consegue acessar o back end. Dai dá pra colocar mais configurações pra restringir isso. Como ta em dev, nao precisa encucar mto com isso ainda.
app.register(appRoutes)

app.listen({
    port: 3333
}).then(() => {
    console.log("Server running on port localhost:3333")
})