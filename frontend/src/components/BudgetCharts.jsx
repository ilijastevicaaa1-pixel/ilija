import React from "react";
import { Pie, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

export function BudgetPieChart({ data }) {
  return <Pie data={data} />;
}

export function BudgetBarChart({ data }) {
  return <Bar data={data} />;
}

export function BudgetLineChart({ data }) {
  return <Line data={data} />;
}
