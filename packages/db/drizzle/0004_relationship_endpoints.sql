ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_entity_id_relationship_type_to_entity_id_unique" UNIQUE("from_entity_id","relationship_type","to_entity_id");
