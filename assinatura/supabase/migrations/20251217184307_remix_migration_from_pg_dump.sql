CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



SET default_table_access_method = heap;

--
-- Name: audit_trail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_trail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid,
    action character varying(100) NOT NULL,
    user_id uuid,
    metadata jsonb,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    contract_html text NOT NULL,
    contract_pdf_url text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    signed_at timestamp with time zone,
    protocol_number character varying(50)
);


--
-- Name: signature_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signature_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid,
    ip_address inet NOT NULL,
    user_agent text,
    "timestamp" timestamp with time zone NOT NULL,
    govbr_token_hash character varying(255),
    govbr_auth_time timestamp with time zone,
    signature_valid boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cpf character varying(14) NOT NULL,
    nome_completo character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    telefone character varying(20),
    cep character varying(10),
    rua character varying(255),
    numero character varying(20),
    cidade character varying(100),
    estado character varying(2),
    endereco_completo text,
    govbr_verified boolean DEFAULT false,
    govbr_nivel_conta character varying(20),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_trail audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_trail
    ADD CONSTRAINT audit_trail_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_protocol_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_protocol_number_key UNIQUE (protocol_number);


--
-- Name: signature_logs signature_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_logs
    ADD CONSTRAINT signature_logs_pkey PRIMARY KEY (id);


--
-- Name: users users_cpf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_cpf_key UNIQUE (cpf);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_contract ON public.audit_trail USING btree (contract_id);


--
-- Name: idx_contracts_protocol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_protocol ON public.contracts USING btree (protocol_number);


--
-- Name: idx_contracts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_user ON public.contracts USING btree (user_id);


--
-- Name: idx_signature_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_signature_contract ON public.signature_logs USING btree (contract_id);


--
-- Name: idx_users_cpf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_cpf ON public.users USING btree (cpf);


--
-- Name: audit_trail audit_trail_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_trail
    ADD CONSTRAINT audit_trail_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: audit_trail audit_trail_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_trail
    ADD CONSTRAINT audit_trail_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: signature_logs signature_logs_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_logs
    ADD CONSTRAINT signature_logs_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: audit_trail Allow audit creation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow audit creation" ON public.audit_trail FOR INSERT WITH CHECK (true);


--
-- Name: audit_trail Allow audit viewing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow audit viewing" ON public.audit_trail FOR SELECT USING (true);


--
-- Name: contracts Allow contract creation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow contract creation" ON public.contracts FOR INSERT WITH CHECK (true);


--
-- Name: contracts Allow contract update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow contract update" ON public.contracts FOR UPDATE USING (true);


--
-- Name: contracts Allow contract viewing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow contract viewing" ON public.contracts FOR SELECT USING (true);


--
-- Name: users Allow public user creation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public user creation" ON public.users FOR INSERT WITH CHECK (true);


--
-- Name: signature_logs Allow signature log creation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow signature log creation" ON public.signature_logs FOR INSERT WITH CHECK (true);


--
-- Name: signature_logs Allow signature log viewing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow signature log viewing" ON public.signature_logs FOR SELECT USING (true);


--
-- Name: users Users can update own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (true);


--
-- Name: users Users can view own data by cpf; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own data by cpf" ON public.users FOR SELECT USING (true);


--
-- Name: audit_trail; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

--
-- Name: contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: signature_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.signature_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


