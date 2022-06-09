module.exports = {
    devServer: {
        proxy: {
            '^/api': {
                target: 'http://localhost:80',
                changeOrigin: true
            },
        }
    },
    publicPath: './'
}
// module.exports = {
//     devServer: {
//         proxy: 'http://localhost:80'
//     }
// }