module.exports = {
    devServer: {
        proxy: {
            '^/api': {
                target: 'http://localhost:80',
                changeOrigin: true
            },
        }
    }
}
// module.exports = {
//     devServer: {
//         proxy: 'http://localhost:80'
//     }
// }