//API RESTful
//

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'

const app = Fastify()
const prisma = new PrismaClient()

/* Método HTTP: Get, Post, Put, Patch, Delete */
/* Put vs Patch: Put atualiza um recurso por completo. Patch atualiza partes desse recurso */

app.register(cors) //Dessa forma qualquer app consegue acessar o back end. Dai dá pra colocar mais configurações pra restringir isso. Como ta em dev, nao precisa encucar mto com isso ainda.

app.get('/hello', async () => {
    const habits = await prisma.habit.findMany()

    return habits
})

app.listen({
    port: 3333
}).then(() => {
    console.log("Server running on port localhost:3333")
})