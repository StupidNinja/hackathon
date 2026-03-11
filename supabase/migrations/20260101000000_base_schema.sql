-- ============================================================
-- BASE SCHEMA — originally created via Supabase Dashboard SQL editor.
-- This migration reconstructs the initial schema so a fresh project
-- (e.g. staging) can be fully provisioned by running all migrations.
-- ============================================================

-- ============================================================
-- Trigger function: set_updated_at
-- Used on profiles and teams to keep updated_at current.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- schools
-- Reference data: list of schools for participant onboarding.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT NOT NULL,
  name_ru    TEXT NOT NULL,
  name_kz    TEXT,
  name_en    TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schools_code_key UNIQUE (code)
);

-- Seed school data (228 rows from Almaty city schools)
INSERT INTO public.schools (id, code, name_ru, is_active) VALUES
  ('4895a371-57f9-4b51-bfa9-64f35451a508', 'school126', 'Cпециализированный лицей № 126', true),
  ('03213da8-92f0-42b0-9863-8f41f8f1ec83', 'school174', '№ 174 школа-гимназия', true),
  ('29dbd5f2-47ab-4341-8ca4-06b00df26328', 'school176', '№ 176 школа-гимназия', true),
  ('2ff619b9-3d6c-428e-a0e2-1f088fbd48b2', 'school188', '№ 188 школа-гимназия', true),
  ('7c1fcbd5-0e4b-4189-9bfd-e3940429ef96', 'school200', '№ 200 школа-гимназия', true),
  ('57f1ef03-e511-4c9b-8033-2ae230af21f7', 'school206', '№ 206 школа-гимназия', true),
  ('3d186a8f-e4ff-4483-a4ac-4f77a5ea3d9f', 'school207', '№207 школа-лицей', true),
  ('5a38da12-10fa-4a42-b102-31c6620e9584', 'school208', '№208 школа-гимназия', true),
  ('f75589f5-92db-46b0-ba18-fd1f964f62d4', 'school175', 'Гимназия «Жаңа Ғасыр» № 175', true),
  ('fdedb4d6-8047-4d8a-a23d-a7d97287bcb6', 'school111', 'Гимназия № 111', true),
  ('52c62407-7f5f-4f82-b613-9f0434126f7c', 'school120', 'Гимназия № 120', true),
  ('7bf04773-410b-4945-9a5f-17f5030401d9', 'school132', 'Гимназия № 132', true),
  ('ffddb689-3570-48ef-96a7-2fdcc8116376', 'school147', 'Гимназия № 147', true),
  ('55361bc6-5a4e-421a-a72f-bb6651b5705c', 'school159', 'Гимназия № 159 им. Ы.Алтынсарина', true),
  ('7e97cca5-12f4-4c44-a19d-a7bf57ee80d5', 'school18', 'Гимназия № 18', true),
  ('a54ad800-01dc-417f-85bc-1e9661017e7a', 'school25', 'Гимназия № 25', true),
  ('99abe31b-b32e-494e-985e-af10d9684594', 'school27', 'Гимназия № 27', true),
  ('6ea0e158-d161-4356-a810-76460459d38a', 'school34', 'Гимназия № 34', true),
  ('87b316c4-bffd-4bdf-a69b-3a13a04b959b', 'school35', 'Гимназия № 35', true),
  ('4e998c93-2c2c-4c97-b9ee-409ba1477020', 'school36', 'Гимназия № 36', true),
  ('6c5fb9f3-9bd0-4d1b-9183-ae15d816c1ca', 'school4',  'Гимназия № 4 им. А.С. Пушкина', true),
  ('80e13a53-8e01-406a-9740-0d200b05a4a9', 'school46', 'Гимназия № 46', true),
  ('ed30a5e6-35e0-40ee-b6a5-3812fc5df872', 'school56', 'Гимназия № 56 им. К.Сатпаева', true),
  ('e7723c24-bcdd-4765-9abd-f53a6087e219', 'school62', 'Гимназия № 62', true),
  ('367dd8a3-ba2f-4bd0-9865-6c9541852e6a', 'school79', 'Гимназия № 79', true),
  ('efad65db-b26c-4990-bb76-4dc2e48b3f24', 'school83', 'Гимназия № 83', true),
  ('5992a1f5-5bac-43a1-bbb7-653ca3c2ca98', 'school105', 'Гимназия №105 имени Ораза Жандосова', true),
  ('d563b840-7b70-4ada-b188-d56d2174ff80', 'school130', 'Гимназия №130', true),
  ('b375de82-5a98-420d-a521-ac86d095b1d4', 'school138', 'Гимназия №138 имени Муслима Базарбаева', true),
  ('3c64830c-a5c5-4340-8c44-963cd63fe402', 'school140', 'Гимназия №140 имени Мукагали Макатаева', true),
  ('68fae64b-8949-4a2e-a28b-6c8f36fb4599', 'school15', 'Гимназия №15', true),
  ('f6308c4e-f169-4a78-ad9e-1c2e460b0dcc', 'school21', 'Гимназия №21', true),
  ('2880cff4-e459-4dc0-b7b8-5e7e71da3661', 'school60', 'Гимназия №60', true),
  ('a265bc2e-7778-4cc1-9c17-00c521cfffec', 'school38', 'Казахстанско-Российская гимназия №38 имени М.В.Ломоносова', true),
  ('69392b7d-92b3-41fd-a5ba-1ee249b1aff0', 'school54', 'Казахстанско-Российская специализированная школа-лицей №54 им. И.В. Панфилова', true),
  ('fc4c2e55-d643-468c-9f6c-b781e867d749', 'schoolKTL', 'Казахстанско-Турецкий лицей (КТЛ)', true),
  ('25281973-a066-43fd-9760-e417a2b8b1b5', 'school107', 'Лицей № 107', true),
  ('56dcb5f3-8c3a-4e68-8d33-0a45c2f0fddc', 'school134', 'Лицей № 134', true),
  ('827e9c5f-303a-42e2-a22b-aeeddcfef17a', 'school161', 'Лицей № 161 им. Ж.Жабаева', true),
  ('a46619bb-b82b-4a90-bff9-b2317ef33e0b', 'school24', 'Лицей № 24', true),
  ('b33d60bb-17f4-4021-b86b-472c6cf92620', 'school166', 'Лицей №166', true),
  ('64086a93-8689-4826-a41b-d4f6f2d09cd1', 'schoolNIS1', 'Назарбаев Интелектуальная школа ФМН (НИШ)', true),
  ('72be989f-e4a5-4fc8-85a5-ab0ad8f2f4a0', 'schoolNIS2', 'Назарбаев Интелектуальная школа ХБН (НИШ)', true),
  ('3248188d-a841-470b-b604-73d249cda9ed', 'school164', 'Общеобразовательная школа 164', true),
  ('fc4ad9a7-6dcc-45ca-a7b8-64472970f9bf', 'school100', 'Общеобразовательная школа № 100', true),
  ('46baad8f-8da0-4634-8378-23a83641e4f7', 'school104', 'Общеобразовательная школа № 104', true),
  ('cb329098-45b4-47e4-9161-c842ef153a3d', 'school106', 'Общеобразовательная школа № 106', true),
  ('74361c94-c97f-4e09-b14d-88f4a8d56724', 'school114', 'Общеобразовательная школа № 114', true),
  ('f87e1afe-0d25-4147-9eb8-c2576b90d558', 'school115', 'Общеобразовательная школа № 115', true),
  ('24c960e0-e9e5-4bbd-8599-a978d2e0bf53', 'school116', 'Общеобразовательная школа № 116', true),
  ('c27c31c1-d4b7-41a4-a355-839dd80af2ef', 'school117', 'Общеобразовательная школа № 117', true),
  ('e553f5f9-a9db-40ba-be75-ea6801dc41c4', 'school121', 'Общеобразовательная школа № 121', true),
  ('078141b9-73ee-4a87-bbf0-be2e4a188c18', 'school122', 'Общеобразовательная школа № 122', true),
  ('d9c39dcf-c276-403e-afd8-893939e92970', 'school124', 'Общеобразовательная школа № 124', true),
  ('3c833ff0-8525-4738-a609-a025cb87b857', 'school127', 'Общеобразовательная школа № 127', true),
  ('bf8e3d21-502b-432d-be2c-d8c326ac9e43', 'school128', 'Общеобразовательная школа № 128', true),
  ('393c5912-5051-4ddc-84a0-620a23aba89e', 'school135', 'Общеобразовательная школа № 135', true),
  ('30de8094-7054-4893-acc0-665314b16ee9', 'school14', 'Общеобразовательная школа № 14', true),
  ('05503397-fddf-4ea5-af17-57aecd668fc1', 'school141', 'Общеобразовательная школа № 141', true),
  ('a9b277be-fa1e-4d84-be8f-f78331508fba', 'school142', 'Общеобразовательная школа № 142', true),
  ('d3c07f5c-50a8-48c4-b278-1e7d7aa6e66b', 'school149', 'Общеобразовательная школа № 149', true),
  ('e5d4d0d1-a870-482c-877d-352e1f3a0f73', 'school155', 'Общеобразовательная школа № 155', true),
  ('3ff5bcdb-05c6-485c-925f-fcff2b2b30bf', 'school158', 'Общеобразовательная школа № 158', true),
  ('72e9a282-5ce3-4fa9-b10c-5d7efdf77544', 'school167', 'Общеобразовательная школа № 167', true),
  ('faad0367-0873-4f47-8baa-537980a21288', 'school168', 'Общеобразовательная школа № 168', true),
  ('90e0acb7-10e4-4995-892f-108be260eb64', 'school170', 'Общеобразовательная школа № 170', true),
  ('86407ec5-e249-4f58-8224-64328ac9cbcc', 'school195', 'Общеобразовательная школа № 195', true),
  ('5fac4d60-92bd-424c-b9c8-34fb000e726d', 'school198', 'Общеобразовательная школа № 198', true),
  ('82a430ab-810a-4bd4-88d8-25decf72595a', 'school20', 'Общеобразовательная школа № 20', true),
  ('d04edab5-cf6f-4875-b6fc-1ae9e1cdcefc', 'school203', 'Общеобразовательная школа № 203', true),
  ('236f860a-ff08-46ce-80ce-c174e031060e', 'school215', 'Общеобразовательная школа № 215', true),
  ('ba5e09e1-6217-4767-81e1-848c90f5ef63', 'school216', 'Общеобразовательная школа № 216', true),
  ('b1cae1c7-7bbe-40ec-8c51-7b97006922f8', 'school26', 'Общеобразовательная школа № 26', true),
  ('46ca5ba3-ded1-47e9-9c49-d832d4faa43a', 'school29', 'Общеобразовательная школа № 29', true),
  ('7efc08d2-7298-48f8-a16c-c0243177ced4', 'school31', 'Общеобразовательная школа № 31', true),
  ('277fd161-6c1a-4950-bfd5-362008a311f8', 'school32', 'Общеобразовательная школа № 32', true),
  ('0541ae7c-d4c5-458f-ad2b-069fb54b7448', 'school42', 'Общеобразовательная школа № 42', true),
  ('027b0f85-fbc1-43a8-9582-195e078f40ea', 'school47', 'Общеобразовательная школа № 47', true),
  ('a2b7c2c6-9c47-4d2d-95c6-c2d6c0f08d92', 'school49', 'Общеобразовательная школа № 49', true),
  ('66b1fef6-8049-4ac6-8fdd-43ccdbe236f5', 'school52', 'Общеобразовательная школа № 52', true),
  ('1b18028a-e303-46ab-9b25-c68bec478626', 'school55', 'Общеобразовательная школа № 55', true),
  ('8e6c2021-6ae6-4f92-8b7c-ae2c6074578d', 'school58', 'Общеобразовательная школа № 58', true),
  ('97b94286-88e0-40bf-9744-dfb74d11f218', 'school64', 'Общеобразовательная школа № 64', true),
  ('5083f7e6-c341-4369-8d17-65f6df31df53', 'school67', 'Общеобразовательная школа № 67', true),
  ('9732fb46-d3d5-49f0-959d-5b81703993b7', 'school7',  'Общеобразовательная школа № 7', true),
  ('0b90cde7-1c99-4185-ac15-7210fb3ef02f', 'school72', 'Общеобразовательная школа № 72', true),
  ('1e667737-faa9-401f-96c7-592511190a32', 'school75', 'Общеобразовательная школа № 75', true),
  ('e130c80e-3f53-4f0e-8e6d-e7a8c069a74e', 'school76', 'Общеобразовательная школа № 76', true),
  ('a1bead1f-a267-4507-8b33-142bd27dd871', 'school82', 'Общеобразовательная школа № 82', true),
  ('4cb2f3c3-891b-48be-be25-69f926053638', 'school84', 'Общеобразовательная школа № 84', true),
  ('544ebb07-5fda-4293-817f-e1ef6020fb91', 'school9',  'Общеобразовательная школа № 9', true),
  ('e32ec969-1c76-44a1-81be-ba6c8b50d278', 'school91', 'Общеобразовательная школа № 91', true),
  ('cb734c4e-4abe-49a6-a241-27e5b5787a0a', 'school96', 'Общеобразовательная школа № 96', true),
  ('d635fa1b-fc13-4bdc-b3bd-58c665ff25a3', 'school97', 'Общеобразовательная школа № 97', true),
  ('d76a681e-3295-4993-9092-af9036e04957', 'school10', 'Общеобразовательная школа №10', true),
  ('ca477b25-202d-4e99-930f-912b00cb5df6', 'school102', 'Общеобразовательная школа №102', true),
  ('b8d36ff8-86c1-4b68-b6b0-4260a9e91f96', 'school108', 'Общеобразовательная школа №108', true),
  ('b73edd39-e6f5-4770-88f7-f7fddbca61a2', 'school109', 'Общеобразовательная школа №109', true),
  ('f396a2f8-2f4e-41f7-9615-adb80adff1a7', 'school11', 'Общеобразовательная школа №11', true),
  ('e45b410a-3063-4627-aed0-41604a0259dc', 'school112', 'Общеобразовательная школа №112', true),
  ('a4b0903a-e3aa-4cd2-b9bc-a4f52ab274d2', 'school125', 'Общеобразовательная школа №125', true),
  ('f924100f-ca06-4a7b-aa6e-c0ff6c0cc325', 'school129', 'Общеобразовательная школа №129', true),
  ('d2afb044-0ae2-4ab1-8e57-2f1b95044ae0', 'school137', 'Общеобразовательная школа №137', true),
  ('6fea4d70-891d-46fa-9454-90519200369a', 'school150', 'Общеобразовательная школа №150', true),
  ('853e986e-c853-40f9-8cbe-d3ec274135fa', 'school151', 'Общеобразовательная школа №151', true),
  ('0120dd4e-a29c-42f7-888b-3141836bb165', 'school154', 'Общеобразовательная школа №154', true),
  ('35460cb2-243e-4ec6-9333-3cd06dc383e2', 'school156', 'Общеобразовательная школа №156', true),
  ('6dfd6e32-fd77-4e34-ad2d-fb8a36e071f1', 'school157', 'Общеобразовательная школа №157', true),
  ('eef0a7e9-c084-46e7-a2c6-ee4e43ed75d4', 'school160', 'Общеобразовательная школа №160', true),
  ('22f50dc3-51a9-40d1-8efc-72355baa4745', 'school17', 'Общеобразовательная школа №17', true),
  ('19666d05-1cc5-4f6d-abd0-c43e052ae71d', 'school171', 'Общеобразовательная школа №171', true),
  ('0a470882-520a-46b4-81f8-5ef0e8151bea', 'school177', 'Общеобразовательная школа №177', true),
  ('d5e16b82-4cc0-46bf-8d46-9f1bbe7b7738', 'school179', 'Общеобразовательная школа №179', true),
  ('0510e12a-61e9-4620-b4ff-87c93217827f', 'school180', 'Общеобразовательная школа №180', true),
  ('f186ce38-63a0-478f-9b28-6ac30ba28fb4', 'school181', 'Общеобразовательная школа №181', true),
  ('0231c572-a117-4bda-ae23-f817a2cf5da2', 'school182', 'Общеобразовательная школа №182', true),
  ('bad53791-e338-4054-af1f-79c4b1c1f71c', 'school183', 'Общеобразовательная школа №183', true),
  ('fdcfb061-bb18-483e-ab25-c411e5a29c64', 'school184', 'Общеобразовательная школа №184', true),
  ('69d079f5-792e-40b5-8b9f-3ca2bd1b6592', 'school185', 'Общеобразовательная школа №185', true),
  ('2d5fa488-b778-42ff-aa97-a686ae598a79', 'school186', 'Общеобразовательная школа №186 им. С.Көпбаева', true),
  -- batch 2
  ('50e6f58a-4195-4a12-bed5-ff9541d3d99a', 'school187', 'Общеобразовательная школа №187', true),
  ('767c8c15-2745-4864-9650-f9624be9907d', 'school189', 'Общеобразовательная школа №189', true),
  ('e8844824-b9e1-42ca-8e2e-6b0462d3fcc4', 'school19', 'Общеобразовательная школа №19', true),
  ('4b2bc84d-8a23-4789-bc08-39a5590878b5', 'school190', 'Общеобразовательная школа №190 имени Шакарима Кудайбердыулы', true),
  ('ea71db16-2dbf-45c2-8851-7ab88619cf7c', 'school191', 'Общеобразовательная школа №191 имени Габидена Мустафина', true),
  ('565a77d8-f850-4455-92aa-7f4bb8d96e9c', 'school192', 'Общеобразовательная школа №192 им. Р.Сәрсенбина', true),
  ('16c02a74-190e-4369-a61a-644f2296c494', 'school193', 'Общеобразовательная школа №193', true),
  ('bd36d9ce-5573-47e8-bdb1-f1300ee77d09', 'school196', 'Общеобразовательная школа №196', true),
  ('9e1cb0c3-073c-4534-a3ff-1dd3ed624711', 'school2',  'Общеобразовательная школа №2', true),
  ('0d94d353-5f8b-42ff-aa4e-b7a842fb5f97', 'school204', 'Общеобразовательная школа №204', true),
  ('62a92734-4e50-410e-846c-864a4026d784', 'school205', 'Общеобразовательная школа №205', true),
  ('690bdcb6-cccd-4b60-b410-7448b56b1ea3', 'school213', 'Общеобразовательная школа №213', true),
  ('1540f2b9-b1b5-4a1c-8e51-a1eb32b2c4d0', 'school214', 'Общеобразовательная школа №214', true),
  ('e20bd64b-ba8a-4bda-82bf-205bc9174195', 'school217', 'Общеобразовательная школа №217', true),
  ('e70428c5-6f61-4503-a606-7c5560a6c411', 'school218', 'Общеобразовательная школа №218', true),
  ('0edc3c3e-1479-4358-b874-ac291f517fb2', 'school219', 'Общеобразовательная школа №219', true),
  ('ed03828b-3a2d-4349-9093-e0baf0bd70bc', 'school220', 'Общеобразовательная школа №220', true),
  ('69a9efe4-8863-4776-8057-88fa5af9a806', 'school221', 'Общеобразовательная школа №221', true),
  ('d8ae4da6-9d74-4970-984e-10f7b77358fb', 'school222', 'Общеобразовательная школа №222', true),
  ('941e99b1-af88-4642-96f0-740bdbd466df', 'school223', 'Общеобразовательная школа №223', true),
  ('5f34b8c6-364f-4e9b-919e-388aee087c49', 'school224', 'Общеобразовательная школа №224', true),
  ('3b5482f4-17cf-42eb-a3d3-72b9aa8001c1', 'school3',  'Общеобразовательная школа №3', true),
  ('5f9b05ee-8505-4156-9caa-298eb2af5d92', 'school37', 'Общеобразовательная школа №37', true),
  ('fbb59a78-590a-4bf8-a576-e96072293a09', 'school40', 'Общеобразовательная школа №40', true),
  ('c166404f-e155-4fd5-98ed-a32b17fc6eb6', 'school43', 'Общеобразовательная школа №43', true),
  ('f8cb708b-7539-4724-8775-ca2d0b77580a', 'school45', 'Общеобразовательная школа №45', true),
  ('6ee33f71-3352-4a52-941a-e35c0166b078', 'school50', 'Общеобразовательная школа №50', true),
  ('1b92f7ac-0871-4392-851b-64073f4e191a', 'school57', 'Общеобразовательная школа №57', true),
  ('3dd2cd71-186c-445f-8244-67fcbcc1b960', 'school61', 'Общеобразовательная школа №61', true),
  ('ce0d609d-87ed-431b-875f-872151acd93d', 'school63', 'Общеобразовательная школа №63', true),
  ('da2eee7d-61a0-4371-a1c3-c07601a9d872', 'school65', 'Общеобразовательная школа №65', true),
  ('0f3ca0db-2c7d-4768-9f78-6f241c3369ef', 'school66', 'Общеобразовательная школа №66', true),
  ('d92c4b13-5bf0-4891-a197-5f030eaa0821', 'school69', 'Общеобразовательная школа №69', true),
  ('2d5a96d1-74b5-421c-9992-ddd64b739716', 'school70', 'Общеобразовательная школа №70', true),
  ('8b465ce5-e426-488e-8532-9b4834842174', 'school74', 'Общеобразовательная школа №74 имени С.Сейфуллина', true),
  ('05e61cc2-1b18-4957-8903-338138c05640', 'school77', 'Общеобразовательная школа №77', true),
  ('7e67c571-6657-4303-b86d-d207d847c076', 'school80', 'Общеобразовательная школа №80', true),
  ('bc30556a-2d97-4144-95dc-93827542c899', 'school85', 'Общеобразовательная школа №85', true),
  ('b37162c3-56c8-4f8b-acd8-e6bb637018db', 'school87', 'Общеобразовательная школа №87', true),
  ('e37ee1eb-7fb2-4df8-80e6-2165392d589d', 'school88', 'Общеобразовательная школа №88', true),
  ('8f1bed1c-a323-470a-9d3e-27650f731f43', 'school89', 'Общеобразовательная школа №89', true),
  ('8a342195-af13-442f-90d9-ce55058d03c5', 'school93', 'Общеобразовательная школа №93', true),
  ('4ba3b913-2f7c-4339-8f5c-3691c866485d', 'school98', 'Общеобразовательная школа №98', true),
  ('66843d76-7e01-4ea9-a3b6-d4564a9c5fd5', 'school99', 'Общеобразовательная школа №99', true),
  ('7efe5b6d-ebd2-49bb-904a-9f9d39af42dc', 'school194', 'Основная средняя школа № 194', true),
  ('8f3d27f6-c6f3-4e8d-ad8a-2e4ce682c39f', 'school197', 'Основная средняя школа № 197', true),
  ('d0796838-a04f-49e8-bdee-d7bdb7dfd4f8', 'schoolRPMS', 'Республиканская Физико-Математическая Школа (РФМШ)', true),
  ('8ee074b8-5599-451d-8fda-4ae3f3d139d3', 'school12', 'Специализированная гимназия № 12 им. Ш. Уалиханова', true),
  ('c381f96c-031c-48d8-aa5c-609990cc193b', 'school199', 'Специализированная гимназия №199', true),
  ('23ca2d22-0e5c-4008-b40f-af0859e64c83', 'school90', 'Специализированная школа-лицей № 90', true),
  ('9825d724-f8f6-45c6-a21c-dfd0e2265dd5', 'school178', 'Специализированный лицей № 178', true),
  ('50209537-8366-482e-8610-3c14e636337d', 'school165', 'Специализированный лицей №165', true),
  ('37e02dc5-fdca-4285-b4fb-fb8b50148be2', 'school39', 'Специализированный лицей №39', true),
  ('f65fc18d-df29-4500-a914-dddc28e9a775', 'school92', 'Специализированный лицей №92 имени Махатма Ганди', true),
  ('d9dfaa62-4bea-4235-aa3e-4bd21485d3c7', 'school41', 'Школа № 41 им. А. Карсакбаева', true),
  ('310291f4-167f-4140-bc4c-2aa6e6db7340', 'school1',  'Школа-гимназия № 1', true),
  ('670ee818-e78e-4cad-bf8c-27d1a8ca5dfc', 'school113', 'Школа-гимназия № 113', true),
  ('a526191a-641b-43f4-97db-a66336e00f59', 'school123', 'Школа-гимназия № 123', true),
  ('c6061330-d24c-44aa-9df4-6e277c0a7ff8', 'school13', 'Школа-гимназия № 13', true),
  ('60e3405f-56ff-4ac2-9e48-c3360997c274', 'school133', 'Школа-гимназия № 133', true),
  ('a35e89e2-1a13-4c37-a6ee-57784bea8440', 'school136', 'Школа-гимназия № 136', true),
  ('e84daa7c-082f-4c22-969c-cff154b9d4c6', 'school139', 'Школа-гимназия № 139', true),
  ('980c1854-d4f0-476b-9a05-d0468979f4f7', 'school144', 'Школа-гимназия № 144', true),
  ('1f81753e-562f-4e17-9141-f40afa635f34', 'school153', 'Школа-гимназия № 153', true),
  ('734bf117-67da-411f-a8bd-53fd41a20fc8', 'school162', 'Школа-гимназия № 162', true),
  ('68c6fffb-c663-48d7-9940-5f561525b0c7', 'school172', 'Школа-гимназия № 172', true),
  ('38b942d3-b396-4623-8333-d7c05bc2ccd6', 'school30', 'Школа-гимназия № 30 им. Д.Снегина', true),
  ('f2e25249-52ef-405c-8389-4d0f0264ff9b', 'school44', 'Школа-гимназия № 44', true),
  ('a4675402-8ec4-4241-83ad-d094a3177ca6', 'school5',  'Школа-гимназия № 5', true),
  ('5585d8ba-1596-45fb-803b-0f9ac421ce5e', 'school59', 'Школа-гимназия № 59', true),
  ('fcf43355-948a-4ac9-9da2-4dfb6e147a10', 'school6',  'Школа-гимназия № 6', true),
  ('992c61d4-51d3-4c66-af26-8988e7132b9d', 'school78', 'Школа-гимназия № 78', true),
  ('6957640a-daf4-4785-9a1e-9ca871dd708d', 'school8',  'Школа-гимназия № 8', true),
  ('98a37a51-c941-432d-9ec0-451f37da0015', 'school86', 'Школа-гимназия № 86 им.Г.Мусрепова', true),
  ('8e87e506-0c2a-4257-b633-93029cddf11f', 'school101', 'Школа-гимназия №101', true),
  ('e67a68ec-89a0-4f7a-ab1e-df3b2ea9ac7e', 'school103', 'Школа-гимназия №103', true),
  ('b5eb4af6-e253-4d13-a51d-23a82a15ca88', 'school110', 'Школа-гимназия №110', true),
  ('dad09e08-3822-45ec-b32e-520a67d6d45f', 'school118', 'Школа-гимназия №118', true),
  ('5f4a89f3-0cca-4271-bdd6-78836ca2afb2', 'school145', 'Школа-гимназия №145 имени аль-Фараби', true),
  ('6fff3316-c80c-46a7-8e47-3b509756d15a', 'school148', 'Школа-гимназия №148', true),
  ('5a69b0b0-a39a-4a71-833d-35cd6ef4e58b', 'school152', 'Школа-гимназия №152', true),
  ('8f184620-75ea-4db1-84c1-e6089dec045c', 'school16', 'Школа-гимназия №16', true),
  ('a6ae6b18-72e8-4e8a-a1be-8feeaf16e32e', 'school201', 'Школа-гимназия №201', true),
  ('c373dcb1-8cf5-494d-8364-a362634a4c8e', 'school202', 'Школа-гимназия №202', true),
  ('60295f3b-b9ad-4bd8-817b-2c562780d7e9', 'school209', 'Школа-гимназия №209', true),
  ('53680f0e-8f5a-44d7-a936-9d1633187f5c', 'school211', 'Школа-гимназия №211', true),
  ('3d1693d5-aa47-48d7-a727-9213fbf0220e', 'school212', 'Школа-гимназия №212', true),
  ('930eff06-7e90-454e-afce-195f8e4e3acb', 'school22', 'Школа-гимназия №22', true),
  ('144faefa-15f6-4d9f-a5d4-97e6c20cd25b', 'school23', 'Школа-гимназия №23', true),
  ('0144884c-3b65-4fac-b0a3-e3ea5c411ac5', 'school51', 'Школа-гимназия №51', true),
  ('35fa924e-8da8-4f67-b08d-aa773f54177c', 'school53', 'Школа-гимназия №53', true),
  ('324c1b2a-f808-4851-b8a9-b9677d48b736', 'school68', 'Школа-гимназия №68', true),
  ('8211f303-b717-43c5-849e-13bf4bdd671f', 'school73', 'Школа-гимназия №73', true),
  ('a77de759-4ed8-4eb6-a607-cb78080a10f4', 'school81', 'Школа-гимназия №81', true),
  ('215e32b2-0465-446c-a799-8d0e067b2c25', 'school94', 'Школа-гимназия №94', true),
  ('c4193cc8-eefa-4f56-82d5-fbdef79407c8', 'school119', 'Школа-лицей № 119', true),
  ('240d0e4b-974c-45d0-951a-53bbc7aadd44', 'school131', 'Школа-лицей № 131 имени Б.Момышұлы', true),
  ('7618ef0b-0473-4d3e-87c2-994676d60777', 'school163', 'Школа-лицей № 163', true),
  ('95ca9883-54bf-4965-a509-c2a17ce8d7ac', 'school173', 'Школа-лицей № 173', true),
  ('6bc41503-e85a-406d-bfde-9335da64a12e', 'school28', 'Школа-лицей № 28 им. М.Маметовой', true),
  ('d7f4b79e-325a-4a74-b6fc-a9668162b88c', 'school33', 'Школа-лицей № 33', true),
  ('7b2fb91c-f120-4d80-bc22-b81f7ed8120c', 'school48', 'Школа-лицей № 48', true),
  ('87c27253-c7a7-4ecd-9364-2f2fa3950b0c', 'school71', 'Школа-лицей № 71', true),
  ('66a45cff-7df0-40f3-838e-2fda92f1a68d', 'school95', 'Школа-лицей № 95', true),
  ('ee8510b5-d064-4054-a8d9-e1f67632a1ce', 'school143', 'Школа-лицей №143', true),
  ('6f066df4-325a-49aa-9bb8-a89109c5353f', 'school146', 'Школа-лицей №146', true),
  ('71fe5d20-bd0e-46c9-a93d-78e613bff8b3', 'school169', 'Школа-лицей №169', true),
  ('d170ef83-3cc5-420d-bc2b-31acc56d288d', 'school210', 'Школа-лицей №210', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- profiles
-- One row per auth.users entry; created during onboarding.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name         TEXT,
  last_name          TEXT,
  phone              TEXT,
  telegram           TEXT,
  grade              INTEGER,
  school_id          UUID REFERENCES public.schools(id),
  custom_school_name TEXT,
  role               TEXT NOT NULL DEFAULT 'team',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- teams
-- One team per captain. captain_id references auth.users semantically
-- (no FK — see migration 20260305000000_fix_teams_captain_id_fkey).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  captain_id   UUID NOT NULL,
  members_count SMALLINT,
  status       TEXT NOT NULL DEFAULT 'registered',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_registered BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT teams_name_key UNIQUE (name)
);

CREATE OR REPLACE TRIGGER set_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- team_members
-- Participants belonging to a team (captain is also a member).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  telegram   TEXT,
  is_captain BOOLEAN NOT NULL DEFAULT false
);
