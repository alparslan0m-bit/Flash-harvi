-- zanki_seed_data.sql
-- Run this in your Supabase SQL Editor to populate demo content.

BEGIN;

-- Variables to store our generated UUIDs
DO $$
DECLARE
    v_year_id UUID;
    v_module_id UUID;
    v_subject_id UUID;
    v_lecture_id UUID;
BEGIN

    -- 1. Create a Year
    INSERT INTO public.years (name, external_id, order_index)
    VALUES ('Year 1 - Fundamentals', 'yr_1_fundamentals', 1)
    RETURNING id INTO v_year_id;

    -- 2. Create a Module
    INSERT INTO public.modules (year_id, name, external_id, order_index, is_free)
    VALUES (v_year_id, 'Cardiovascular System', 'mod_cvs', 1, true)
    RETURNING id INTO v_module_id;

    -- 3. Create a Subject
    INSERT INTO public.subjects (module_id, name, external_id, order_index, is_free)
    VALUES (v_module_id, 'Anatomy of the Heart', 'sub_cvs_anatomy', 1, true)
    RETURNING id INTO v_subject_id;

    -- 4. Create a Lecture
    INSERT INTO public.lectures (subject_id, name, external_id, order_index, card_count)
    VALUES (v_subject_id, 'Chambers and Valves', 'lec_cvs_chambers', 1, 5)
    RETURNING id INTO v_lecture_id;

    -- 5. Create Flashcards for the Lecture (Sequential order 1 to 5)
    INSERT INTO public.flashcards (lecture_id, front, back, hint, tags, card_order)
    VALUES 
    (v_lecture_id, 'What are the four chambers of the heart?', 'Right atrium, right ventricle, left atrium, left ventricle.', 'Think about the upper and lower divisions.', ARRAY['anatomy', 'basics'], 1),
    
    (v_lecture_id, 'Which valve separates the right atrium from the right ventricle?', 'Tricuspid valve.', 'Tri to get it right.', ARRAY['valves', 'right-heart'], 2),
    
    (v_lecture_id, 'Which chamber of the heart pumps oxygenated blood to the systemic circulation?', 'Left ventricle.', 'It has the thickest myocardium.', ARRAY['function', 'left-heart'], 3),
    
    (v_lecture_id, 'What is the function of the chordae tendineae?', 'They anchor the AV valve leaflets to papillary muscles, preventing prolapse during ventricular contraction.', 'Heart strings.', ARRAY['anatomy', 'valves'], 4),
    
    (v_lecture_id, 'The mitral valve is also known as the...', 'Bicuspid valve.', 'It has only two cusps.', ARRAY['valves', 'left-heart'], 5);

END $$;

COMMIT;
