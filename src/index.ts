import express from 'express';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log(`plansignal:${PORT}`);
});

export default app;
