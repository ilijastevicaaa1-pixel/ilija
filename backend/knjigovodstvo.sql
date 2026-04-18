DROP TABLE IF EXISTS public.users;

CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
);

INSERT INTO public.users (id, username, email, password_hash, role) VALUES
(1, 'admin', 'admin@firma.com', '$2b$10$0v2nq6G6YpP3z5lY0p7s7uX8iZp4pG2x5J9jJ6u8kYp3tFz7lYp7W', 'admin'),
(2, 'userA', 'userA@firma.com', '$2b$10$1x3pA7H8QwR9s6dT2uV4nO9bK8mL3pQ5rT7vW9yZ1xC3vB5nM7pQ', 'user'),
(3, 'userB', 'userB@firma.com', '$2b$10$2k4mB8N9RwT6s5dE3vF7pQ8lM9nB2vC4xZ6tY8uP1qW3eR5tU7yI', 'user'),
(4, 'ilija', 'ilija', '$2b$10$3n5pC9O0TxU7r6eD4wG8qR9mN0bC3xD5yA7uS9pQ2wE4rT6yU8iO', 'user'),
(5, 'testlogin', 'testlogin', '$2b$10$4o6qD0P1UyV8s7fF5xH9rS0nO1cD4yE6zB8vT0qR3xF5tG7uI9oP', 'user'),
(6, 'probauser123', 'probauser123', '$2b$10$5p7rE1Q2VzW9t8gG6yI0sT1oP2dE5zF7aC9wU1rS4yG6uH8iJ0pQ', 'user');
