//Conection to prisma client

import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient()

//{log:['query']} we can pass this as parameter to log the SQL query that prisma send to the database
