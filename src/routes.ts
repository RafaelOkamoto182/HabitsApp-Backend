import dayjs from "dayjs"
import { prisma } from "./lib/prisma"
import { FastifyInstance } from "fastify"
import { z } from "zod"

//Function to separate the routes from the main (server.ts) file
//It's an asyns function because it needs to be used by the app.register in server.ts. Whenever we use <register(function)>, the function needs to be async.

export async function appRoutes(app: FastifyInstance) {

    app.post('/habits', async (request) => {

        //Request data validation with zod
        const createHabitBody = z.object({
            title: z.string(),
            weekDays: z.array(z.number().min(0).max(6))    //week days body example: [0]; [0,2]; [0,1,2,3,4,5,6]
        })

        //envelop the request.body with the createHabitBody
        const { title, weekDays } = createHabitBody.parse(request.body)

        //In this app, the habit created on a day, will be available in that same day. So if I create an habit today, I can check it today as done.
        //we could've done this with string manipulation. But since the focus of the project is to learn new things, I used the dayJS 
        const today = dayjs().startOf('D').toDate()

        //create the habit
        await prisma.habit.create({
            data: {
                title: title,
                created_at: new Date(),
                weekDays: {
                    create: weekDays.map(weekDay => {
                        //we're creating an array of entries on the db, one for each weekDay.
                        return { week_day: weekDay }
                    })
                }

            }
        })

    })

    app.get('/day', async (request) => {
        //get the habits and the completed habits in the given day

        const getDayParams = z.object({
            date: z.coerce.date()  //when we get the query params (parameters through the url), they came in Strings. The coerce converts the params to the type specified.
        })

        //getting the date object 
        const { date } = getDayParams.parse(request.query)

        const parsedDate = dayjs(date).startOf('day')
        const weekDay = parsedDate.get('day')
        //this is not working properly because it always converts the timezone and set this weekDay to one day before what we really want. (problem with the 00:00:00 hour)
        //will fix this on the front end. If we send the day with 03:00:00 or later, it will get the tight day.
        //WANNA TRY AND FIX THIS LATER WITH ONLY THE BACK END

        //getting the habits that should appear on the selected day
        const possibleHabits = await prisma.habit.findMany({
            where: {
                created_at: {
                    lte: date
                },
                weekDays: {
                    some: {
                        week_day: weekDay
                    }
                }
            }
        })
        //some: search for habits where at least one weekday match the requisites. We choose this because we wanna find habits that has at least one weekDay that matches the
        //      selected weekday.
        //every: search for habits where evey weekday match the requisites
        //none: search for habits where no weekdays match the requisites.

        //getting the habits that have been completed on the given day
        const day = await prisma.day.findUnique({
            where: {
                date: parsedDate.toDate()
            },
            include: {
                dayHabits: true
            }
        })
        //we firstly find the day object of given day and then include the dayHabits, which are the habits completed on that day

        const completedHabits = day?.dayHabits.map(dayHabit => {
            return dayHabit.habit_id
        })

        return {
            possibleHabits,
            completedHabits
        }

    })

    app.patch('/habits/:id/toggle', async (request) => {
        //check / uncheck an habit

        const queryParams = z.object({
            id: z.string().uuid()
        })

        const { id } = queryParams.parse(request.params)

        const today = dayjs().startOf('day').toDate()
        //if we wanted people to be able to change the check from previous days, we must get the day that the person wants to change. Maybe in the habits route.

        let day = await prisma.day.findUnique({
            where: {
                date: today
            }
        })

        //Since we only create an entry on the day table IF there's at least one habit completed on that day, we need to create it if it's the first habit the user is checking:
        if (!day) {
            day = await prisma.day.create({
                data: {
                    date: today
                }
            })
        }

        const dayHabit = await prisma.dayHabit.findUnique({
            where: {
                day_id_habit_id: {
                    day_id: day.id,
                    habit_id: id
                }
            }
        })
        //the relation of day_id and habit_id is possible because of the @@unique on the schemas

        //deletes the habit completed on that day if its already checked as done. (the toggle property)
        if (dayHabit) {
            await prisma.dayHabit.delete({
                where: {
                    id: dayHabit.id
                }
            })
        } else {
            await prisma.dayHabit.create({
                data: {
                    day_id: day.id,
                    habit_id: id
                }
            })
        }

    })

    app.get('/summary', async () => {
        //get [{}, {}, {date: 13/04, possibleHabits: 5, completed: 1}, {}]
        //since this query is a bit complex, using prisma would be less optimized and might affect performance some time. So we use the raw SQL query

        //Queries between () are called subquerries. Could've been done with JOIN
        //The cast is needed because prisma doesnt know how to handle BigInt format (wich is the one returned from COUNT)

        //strftime is a SQLite function to work with dates. The %w is to get the week day from D.Date. The division by 1000 is because SQlite uses de unixepoch date format, but
        //with the miliseconds, so it adds three 0's at the end.

        const summary = prisma.$queryRaw`
        SELECT D.id, D.date,
        (
            SELECT cast(COUNT (*) as float) 
            FROM day_habits DH
            WHERE DH.day_id = D.id
        ) as completed,
        (
            SELECT cast(COUNT (*) as float) 
            FROM habit_week_days HWD
            JOIN habits H 
                ON H.id = HWD.habit_id
            WHERE HWD.week_day = cast(strftime('%w', D.Date/1000.0, 'unixepoch') as int)
            AND H.created_at <= D.date
        ) as amount       
            
        FROM days D    
        `

        return summary
    })
}

