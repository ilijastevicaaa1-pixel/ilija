import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function SimpleBarChart({ data, title }) {
  const chartData = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        label: title,
        data: data.map((item) => item.value),
        backgroundColor: "#1976d2",
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: !!title, text: title },
    },
  };
  return <Bar data={chartData} options={options} />;
}
