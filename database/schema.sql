-- Creación de tabla: businesses
CREATE TABLE IF NOT EXISTS businesses (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  phone       VARCHAR(20),
  address     VARCHAR(200),
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Creación de tabla: services
CREATE TABLE IF NOT EXISTS services (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  duration     INTEGER NOT NULL,
  price        NUMERIC(10,2),
  description  TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Creación de tabla: availability
CREATE TABLE IF NOT EXISTS availability (
  id           SERIAL PRIMARY KEY,
  business_id  INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  CONSTRAINT unique_business_day UNIQUE (business_id, day_of_week)
);

-- Creación de tabla: clients
CREATE TABLE IF NOT EXISTS clients (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20) NOT NULL,
  email      VARCHAR(150),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Creación de tabla: appointments
CREATE TABLE IF NOT EXISTS appointments (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'cancelled_occupied')),
  liberates_at TIMESTAMP NULL,
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
