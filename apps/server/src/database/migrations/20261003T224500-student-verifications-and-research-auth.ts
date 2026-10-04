import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Create student_verifications table
  await db.schema
    .createTable('student_verifications')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('serial', 'integer', (col) => col.notNull())
    .addColumn('student_id', 'varchar(50)', (col) => col.notNull().unique())
    .addColumn('student_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('total_credits_attempted', 'numeric(6, 2)', (col) => col.notNull())
    .addColumn('total_credits_earned', 'numeric(6, 2)', (col) => col.notNull())
    .addColumn('cgpa', 'numeric(4, 2)', (col) => col.notNull())
    .addColumn('status', 'varchar(50)', (col) => col.notNull().defaultTo('Active'))
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('idx_student_verifications_student_id')
    .ifNotExists()
    .on('student_verifications')
    .column('student_id')
    .execute();

  // 2. Create research_users table for persistent authentication
  await db.schema
    .createTable('research_users')
    .ifNotExists()
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_uuid_v7()`))
    .addColumn('student_id', 'varchar(50)', (col) => col.notNull().unique())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('email', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn('password_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('role', 'varchar(50)', (col) => col.notNull().defaultTo('Researcher'))
    .addColumn('team_id', 'varchar(50)', (col) => col.notNull())
    .addColumn('cgpa', 'numeric(4, 2)', (col) => col)
    .addColumn('credits', 'numeric(6, 2)', (col) => col)
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`))
    .execute();

  // 3. Create research_otps table for real email OTP verification
  await db.schema
    .createTable('research_otps')
    .ifNotExists()
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('email', 'varchar(255)', (col) => col.notNull())
    .addColumn('student_id', 'varchar(50)', (col) => col)
    .addColumn('otp_code', 'varchar(10)', (col) => col.notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`))
    .execute();

  // 4. Seed all 121 official university students
  await sql`
    INSERT INTO student_verifications (serial, student_id, student_name, total_credits_attempted, total_credits_earned, cgpa, status, updated_at)
    VALUES
      (1, '0272320005101116', 'Muhaiminul Islam', 119.5, 119.5, 3.96, 'Active', CURRENT_TIMESTAMP),
      (2, '0272320005101105', 'Fateha Binta Sharraf Tamanna', 119.5, 119.5, 3.93, 'Active', CURRENT_TIMESTAMP),
      (3, '0272320005101111', 'Md. Rakib Hasan Shuvo', 119.5, 119.5, 3.91, 'Active', CURRENT_TIMESTAMP),
      (4, '0272320005101135', 'Md. Sarowar Hossain', 119.5, 119.5, 3.89, 'Active', CURRENT_TIMESTAMP),
      (5, '0272320005101273', 'Avijite Roy', 119.5, 119.5, 3.88, 'Active', CURRENT_TIMESTAMP),
      (6, '0272320005101294', 'Md. Abrar Siddiqui', 119.5, 119.5, 3.85, 'Active', CURRENT_TIMESTAMP),
      (7, '0272320005101252', 'Sumaiya Akter Bonna', 119.5, 119.5, 3.78, 'Active', CURRENT_TIMESTAMP),
      (8, '0272320005101029', 'Nure Jannat sawda', 119.5, 119.5, 3.76, 'Active', CURRENT_TIMESTAMP),
      (9, '0272320005101279', 'Tanjina Akter Mohema', 119.5, 119.5, 3.76, 'Active', CURRENT_TIMESTAMP),
      (10, '0272320005101290', 'Sanjida Ahmed', 119.5, 119.5, 3.75, 'Active', CURRENT_TIMESTAMP),
      (11, '0272320005101017', 'Mst Taslima Khatun', 119.5, 119.5, 3.75, 'Active', CURRENT_TIMESTAMP),
      (12, '0272320005101214', 'Meherun Nessa Shanta', 119.5, 119.5, 3.73, 'Active', CURRENT_TIMESTAMP),
      (13, '0272320005101077', 'Sadia Akter', 119.5, 119.5, 3.73, 'Active', CURRENT_TIMESTAMP),
      (14, '0272320005101210', 'Esrat Jahan Rimi', 119.5, 119.5, 3.67, 'Active', CURRENT_TIMESTAMP),
      (15, '0272320005101186', 'Afsany Masud Tisha', 119.5, 119.5, 3.63, 'Active', CURRENT_TIMESTAMP),
      (16, '0272320005101131', 'Tasnim Jahan Anika', 119.5, 119.5, 3.63, 'Active', CURRENT_TIMESTAMP),
      (17, '0272320005101092', 'Rahul Roy Nipon', 119.5, 119.5, 3.55, 'Active', CURRENT_TIMESTAMP),
      (18, '0272320005101155', 'Fahim Imtiaz Bhuiyan', 119.5, 119.5, 3.49, 'Active', CURRENT_TIMESTAMP),
      (19, '0272320005101236', 'Abida Sultana Dana', 119.5, 119.5, 3.41, 'Active', CURRENT_TIMESTAMP),
      (20, '0272320005101149', 'Sumaiya Islam', 119.5, 119.5, 3.4, 'Active', CURRENT_TIMESTAMP),
      (21, '0272320005101129', 'Md Mahin Sarkar', 119.5, 119.5, 3.4, 'Active', CURRENT_TIMESTAMP),
      (22, '0272320005101220', 'Md Sabbir Ahmed', 119.5, 119.5, 3.39, 'Active', CURRENT_TIMESTAMP),
      (23, '0272320005101302', 'Meherin Jahan Maeesha', 119.5, 119.5, 3.32, 'Active', CURRENT_TIMESTAMP),
      (24, '0272320005101073', 'Mrittika Rani Dutta', 119.5, 119.5, 3.3, 'Active', CURRENT_TIMESTAMP),
      (25, '0272320005101296', 'Fariha Ahmed Riya', 119.5, 119.5, 3.28, 'Active', CURRENT_TIMESTAMP),
      (26, '0272320005101026', 'Md. Ahad Miah', 119.5, 119.5, 3.28, 'Active', CURRENT_TIMESTAMP),
      (27, '0272320005101128', 'Tonmoy Das', 119.5, 119.5, 3.22, 'Active', CURRENT_TIMESTAMP),
      (28, '0272320005101151', 'Md. Yousuf Fahim', 119.5, 119.5, 3.18, 'Active', CURRENT_TIMESTAMP),
      (29, '0272320005101205', 'Sumiya Akter Jumo', 119.5, 119.5, 3.17, 'Active', CURRENT_TIMESTAMP),
      (30, '0272320005101153', 'Sumaia Akter Roshna', 119.5, 119.5, 3.16, 'Active', CURRENT_TIMESTAMP),
      (31, '0272320005101057', 'Md. Mozammel Hosen Shihab', 119.5, 119.5, 3.15, 'Active', CURRENT_TIMESTAMP),
      (32, '0272320005101240', 'Md. Rasel Ahmed', 119.5, 113.5, 3.14, 'Active', CURRENT_TIMESTAMP),
      (33, '0272320005101268', 'Arifa Siddika', 119.5, 106.0, 3.12, 'Active', CURRENT_TIMESTAMP),
      (34, '0272320005101086', 'Md. Abu Talha', 119.5, 119.5, 3.12, 'Active', CURRENT_TIMESTAMP),
      (35, '0272320005101053', 'Sadikun Rahman Alif', 119.5, 119.5, 3.11, 'Active', CURRENT_TIMESTAMP),
      (36, '0272320005101313', 'Lithun Shekh', 119.5, 119.5, 3.11, 'Active', CURRENT_TIMESTAMP),
      (37, '0272320005101139', 'Nizam Uddin Nayeem', 119.5, 119.5, 3.09, 'Active', CURRENT_TIMESTAMP),
      (38, '0272320005101222', 'Md Mashrafi Alom', 119.5, 113.5, 3.08, 'Active', CURRENT_TIMESTAMP),
      (39, '0272320005101253', 'Md. Maharaf Hosen', 119.5, 119.5, 3.07, 'Active', CURRENT_TIMESTAMP),
      (40, '0272320005101100', 'K.M. Shakhawat Abedin', 119.5, 119.5, 3.05, 'Active', CURRENT_TIMESTAMP),
      (41, '0272320005101303', 'Jannatul Ferdousi', 119.5, 119.5, 3.05, 'Active', CURRENT_TIMESTAMP),
      (42, '0272320005101154', 'Sabekun Nahar Mim', 119.5, 119.5, 3.02, 'Active', CURRENT_TIMESTAMP),
      (43, '0272320005101286', 'Sadia Jahan Mou', 119.5, 119.5, 3.02, 'Active', CURRENT_TIMESTAMP),
      (44, '0272320005101147', 'Md. Sohug Mia', 119.5, 119.5, 3.0, 'Active', CURRENT_TIMESTAMP),
      (45, '0272320005101218', 'Bristy Shaha', 119.5, 119.5, 2.99, 'Active', CURRENT_TIMESTAMP),
      (46, '0272320005101102', 'Md. Siam Rahman', 123.5, 119.5, 2.98, 'Active', CURRENT_TIMESTAMP),
      (47, '0272320005101233', 'Somir Shajahan Shaon', 119.5, 113.5, 2.97, 'Active', CURRENT_TIMESTAMP),
      (48, '0272320005101203', 'Sampa Sarker', 119.5, 119.5, 2.95, 'Active', CURRENT_TIMESTAMP),
      (49, '0272320005101204', 'Md. Abdullah Al Numan', 119.5, 119.5, 2.95, 'Active', CURRENT_TIMESTAMP),
      (50, '0272320005101087', 'Md. Khairul Islam', 119.5, 119.5, 2.94, 'Active', CURRENT_TIMESTAMP),
      (51, '0272320005101169', 'Naim Hasan', 119.5, 119.5, 2.93, 'Active', CURRENT_TIMESTAMP),
      (52, '0272320005101125', 'Zahin Abdullah', 119.5, 116.5, 2.92, 'Active', CURRENT_TIMESTAMP),
      (53, '0272320005101187', 'Md. Shohag', 119.5, 119.5, 2.92, 'Active', CURRENT_TIMESTAMP),
      (54, '0272320005101023', 'Md.Atiqul islam Atiq', 119.5, 119.5, 2.91, 'Active', CURRENT_TIMESTAMP),
      (55, '0272320005101293', 'Ajonta Roy', 119.5, 117.5, 2.91, 'Active', CURRENT_TIMESTAMP),
      (56, '0272320005101165', 'Md Foyes Ahmed Parnto', 119.5, 119.5, 2.89, 'Active', CURRENT_TIMESTAMP),
      (57, '0272320005101032', 'Dhruba Saha', 119.5, 119.5, 2.87, 'Active', CURRENT_TIMESTAMP),
      (58, '0272320005101007', 'Shova Tasmi', 99.25, 96.75, 2.86, 'Active', CURRENT_TIMESTAMP),
      (59, '0272320005101014', 'Md. Rabbi Montasir', 101.75, 99.75, 2.86, 'Active', CURRENT_TIMESTAMP),
      (60, '0272320005101200', 'Shadia Sharif Simla', 110.5, 106.75, 2.84, 'Active', CURRENT_TIMESTAMP),
      (61, '0272320005101101', 'Sabrina Akter', 119.5, 116.5, 2.83, 'Active', CURRENT_TIMESTAMP),
      (62, '0272320005101162', 'Noman Karim', 119.5, 119.5, 2.82, 'Active', CURRENT_TIMESTAMP),
      (63, '0272320005101056', 'Md. Sagor Hossain', 98.25, 96.75, 2.8, 'Active', CURRENT_TIMESTAMP),
      (64, '0272320005101278', 'Md Zohirul Islam', 119.5, 116.5, 2.8, 'Active', CURRENT_TIMESTAMP),
      (65, '0272320005101250', 'Md. Shakil Ahmed', 119.5, 119.5, 2.8, 'Active', CURRENT_TIMESTAMP),
      (66, '0272320005101177', 'Riya Akter', 119.5, 119.5, 2.78, 'Active', CURRENT_TIMESTAMP),
      (67, '0272320005101180', 'Dwin Islam', 119.5, 119.5, 2.77, 'Active', CURRENT_TIMESTAMP),
      (68, '0272320005101137', 'Syba Khanom Sayma', 119.5, 119.5, 2.74, 'Active', CURRENT_TIMESTAMP),
      (69, '0272320005101109', 'Md. Shahriar Kabir', 119.5, 116.5, 2.74, 'Active', CURRENT_TIMESTAMP),
      (70, '0272320005101264', 'Sagor Kumar Dash', 119.5, 113.5, 2.73, 'Active', CURRENT_TIMESTAMP),
      (71, '0272320005101132', 'Partha Halder Pathik', 99.25, 97.75, 2.73, 'Active', CURRENT_TIMESTAMP),
      (72, '0272320005101206', 'Md. Mahidi Chowdhury', 99.25, 96.25, 2.71, 'Active', CURRENT_TIMESTAMP),
      (73, '0272320005101117', 'Md. Al Mamun', 119.5, 113.5, 2.7, 'Active', CURRENT_TIMESTAMP),
      (74, '0272320005101190', 'Md.Rezwan Amin Meraz', 118.75, 117.25, 2.67, 'Active', CURRENT_TIMESTAMP),
      (75, '0272320005101270', 'Md Moshiur Rahman Monju', 119.5, 118.0, 2.67, 'Active', CURRENT_TIMESTAMP),
      (76, '0272320005101262', 'Kaniz Fatema Mahi', 119.5, 113.5, 2.67, 'Active', CURRENT_TIMESTAMP),
      (77, '0272320005101043', 'Plabon Gharami', 119.5, 115.0, 2.65, 'Active', CURRENT_TIMESTAMP),
      (78, '0272320005101113', 'Md.Rihad Hasan Rasin', 119.5, 116.5, 2.65, 'Active', CURRENT_TIMESTAMP),
      (79, '0272320005101024', 'Md. Masum Hossain', 119.5, 116.5, 2.64, 'Active', CURRENT_TIMESTAMP),
      (80, '0272320005101308', 'Md Saidur Rahman Siam', 119.5, 119.5, 2.63, 'Active', CURRENT_TIMESTAMP),
      (81, '0272320005101035', 'Rashedur Rahman Abir', 119.5, 119.5, 2.61, 'Active', CURRENT_TIMESTAMP),
      (82, '0272320005101261', 'Md. Tanvir Ahmed', 119.5, 98.5, 2.6, 'Active', CURRENT_TIMESTAMP),
      (83, '0272320005101238', 'Md. Tanvir Ahmed Afridi', 119.5, 113.5, 2.6, 'Active', CURRENT_TIMESTAMP),
      (84, '0272320005101095', 'Maysha Farjana', 119.5, 115.75, 2.6, 'Active', CURRENT_TIMESTAMP),
      (85, '0272320005101018', 'Mst. Tahmina', 119.5, 116.5, 2.56, 'Active', CURRENT_TIMESTAMP),
      (86, '0272320005101001', 'Md. Tanim Khan', 119.5, 119.5, 2.53, 'Active', CURRENT_TIMESTAMP),
      (87, '0272320005101231', 'Shihab Hossain', 119.5, 116.5, 2.52, 'Active', CURRENT_TIMESTAMP),
      (88, '0272320005101243', 'Bijoy Barmon', 119.5, 113.5, 2.52, 'Active', CURRENT_TIMESTAMP),
      (89, '0272320005101019', 'Md. Hridoy', 119.5, 110.5, 2.49, 'Active', CURRENT_TIMESTAMP),
      (90, '0272320005101066', 'Miraj prodhan Naim', 119.5, 116.5, 2.46, 'Active', CURRENT_TIMESTAMP),
      (91, '0272320005101046', 'Md. Tawhidul Islam Likhon', 119.5, 112.75, 2.45, 'Active', CURRENT_TIMESTAMP),
      (92, '0272320005101015', 'Kishor Kumar Shil', 119.5, 116.5, 2.45, 'Active', CURRENT_TIMESTAMP),
      (93, '0272320005101140', 'Mahir Foysal', 119.5, 116.5, 2.39, 'Active', CURRENT_TIMESTAMP),
      (94, '0272320005101254', 'Md. Forid Sikder', 119.5, 115.0, 2.39, 'Active', CURRENT_TIMESTAMP),
      (95, '0272320005101037', 'Ahquaf Bin Monjur', 119.5, 113.5, 2.38, 'Active', CURRENT_TIMESTAMP),
      (96, '0272320005101099', 'Mst.Shahniaj Akter Shammi', 119.5, 112.75, 2.38, 'Active', CURRENT_TIMESTAMP),
      (97, '0272320005101136', 'Jubyda Akter Niama', 119.5, 103.5, 2.37, 'Active', CURRENT_TIMESTAMP),
      (98, '0272320005101178', 'Md Ismail Mollah', 100.5, 94.5, 2.36, 'Active', CURRENT_TIMESTAMP),
      (99, '0272320005101098', 'Tariqul Islam', 119.5, 113.5, 2.36, 'Active', CURRENT_TIMESTAMP),
      (100, '0272320005101275', 'Md. Rifat Islam', 119.5, 110.5, 2.33, 'Active', CURRENT_TIMESTAMP),
      (101, '0272320005101148', 'Md. Nabil Hasan', 119.5, 113.5, 2.32, 'Active', CURRENT_TIMESTAMP),
      (102, '0272320005101208', 'Md.Meherab Mubin Chowdhury', 119.5, 110.5, 2.32, 'Active', CURRENT_TIMESTAMP),
      (103, '0272320005101168', 'Bithi Rani Mondol', 119.5, 99.25, 2.3, 'Active', CURRENT_TIMESTAMP),
      (104, '0272320005101305', 'Rayhan Dewan Rohan', 119.5, 116.5, 2.29, 'Active', CURRENT_TIMESTAMP),
      (105, '0272320005101266', 'Md. Nahid Hasan', 119.5, 100.0, 2.26, 'Active', CURRENT_TIMESTAMP),
      (106, '0272320005101272', 'Anindo Sarker', 119.5, 112.5, 2.25, 'Active', CURRENT_TIMESTAMP),
      (107, '0272320005101281', 'Sheikh Saad', 117.5, 105.5, 2.23, 'Active', CURRENT_TIMESTAMP),
      (108, '0272320005101175', 'Sumaiya khatun', 119.5, 110.5, 2.22, 'Active', CURRENT_TIMESTAMP),
      (109, '0272320005101021', 'Aysha Siddika', 119.5, 111.25, 2.22, 'Active', CURRENT_TIMESTAMP),
      (110, '0272320005101258', 'Fatema Akter Anna', 119.5, 106.5, 2.21, 'Active', CURRENT_TIMESTAMP),
      (111, '0272320005101207', 'Abdullaha Al Noman', 119.5, 98.5, 2.18, 'Active', CURRENT_TIMESTAMP),
      (112, '0272320005101044', 'Shaikh Md. Mainul Islam', 119.5, 101.5, 2.14, 'Active', CURRENT_TIMESTAMP),
      (113, '0272320005101048', 'Mahrab Uddin Shohag', 119.5, 107.75, 2.11, 'Active', CURRENT_TIMESTAMP),
      (114, '0272320005101158', 'Sumaiya Akter', 119.5, 98.5, 2.09, 'Active', CURRENT_TIMESTAMP),
      (115, '0272320005101150', 'Asif Abedin Sabbir', 119.5, 100.0, 2.05, 'Active', CURRENT_TIMESTAMP),
      (116, '0272320005101090', 'Afridy Zaman', 119.5, 107.5, 2.05, 'Active', CURRENT_TIMESTAMP),
      (117, '0272320005101118', 'Liton Hossain', 119.5, 94.0, 2.0, 'Active', CURRENT_TIMESTAMP),
      (118, '0272320005101246', 'Sajia Afrin Sharna', 119.5, 97.0, 1.97, 'Active', CURRENT_TIMESTAMP),
      (119, '0272320005101265', 'Md.Mustak Ahmed', 119.5, 93.0, 1.95, 'Active', CURRENT_TIMESTAMP),
      (120, '0272320005101179', 'Yusuf Hasan Rizbi', 119.5, 92.5, 1.94, 'Active', CURRENT_TIMESTAMP),
      (121, '0272320005101280', 'Md. Maidul Islam Zihad', 119.5, 95.5, 1.83, 'Active', CURRENT_TIMESTAMP)
    ON CONFLICT (student_id) DO UPDATE SET
      serial = EXCLUDED.serial,
      student_name = EXCLUDED.student_name,
      total_credits_attempted = EXCLUDED.total_credits_attempted,
      total_credits_earned = EXCLUDED.total_credits_earned,
      cgpa = EXCLUDED.cgpa,
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('research_otps').ifExists().execute();
  await db.schema.dropTable('research_users').ifExists().execute();
  await db.schema.dropTable('student_verifications').ifExists().execute();
}
