import { jsx } from '@app/html-jsx'

app.get('/', async (ctx) => {
  return (
    <html>
      <head>
        <script src="/s/metric/clarity.js"></script>
        <style>{`
          body {
            height: 100%;
            width: 100%;
            background-image: url(https://fs.cdn-chatium.io/thumbnail/image_bXkpfHZFGu.2393x2250.png/s/400x400);
            background-size: 196px;
            background-color: #f8f8f8;
          }
        `}</style>
      </head>
      <body></body>
    </html>
  )
})
