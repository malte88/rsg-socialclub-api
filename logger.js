const {createLogger, transports, format} = require('winston');

const logger = createLogger({
    transports: [
        new transports.File({
            filename: 'info.log',
            level: 'info',
            format: format.simple()
        })
    ]
})

module.exports = {logger};