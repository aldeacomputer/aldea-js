CREATE TABLE outputs(
    origin BLOB PRIMARY KEY,
    id TEXT,
    location BLOB,
    class BLOB,
    lock BLOB
    state BLOB,
    abi TEXT
);

CREATE TABLE packages(
    id TEXT PRIMARY KEY,
    doc TEXT
);

CREATE TABLE keys(
    privkey TEXT PRIMARY KEY
);