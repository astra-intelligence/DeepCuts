// Runs the shared TagRepository contract against the in-memory (guest) store.
import { tagRepositoryContract } from '../tagRepository.contract'
import { createInMemoryTagRepository } from './InMemoryTagRepository'

tagRepositoryContract('InMemoryTagRepository', createInMemoryTagRepository)
