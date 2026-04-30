from psycopg2 import pool
import os
from dotenv import load_dotenv
from contextlib import contextmanager

load_dotenv()

dbname = os.getenv("DB_NAME")
dbuser = os.getenv("DB_USER")
dbhost = os.getenv("DB_HOST")
dbport = os.getenv("DB_PORT")
dbpassword = os.getenv("DB_PASSWORD")

connection_pool = pool.ThreadedConnectionPool(1, 20, dbname=dbname, user=dbuser, password=dbpassword, host=dbhost, port=dbport)

@contextmanager
def get_db_connection():
    conn = connection_pool.getconn()
    try:
        yield conn
    finally:
        connection_pool.putconn(conn)


