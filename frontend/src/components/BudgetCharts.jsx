import React from "react";
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
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
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
