CREATE ROLE core;
CREATE ROLE "core-worker" LOGIN PASSWORD 'change-this';

CREATE DATABASE core OWNER core
TEMPLATE template0 LC_COLLATE "C" LC_CTYPE "C";