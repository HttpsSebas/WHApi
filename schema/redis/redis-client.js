import redis from "redis"

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || "redis",
    url: process.env.REDIS_URL,
    port: process.env.REDIS_PORT
})

redisClient.on('error', (err) => console.log(err))

export default redisClient