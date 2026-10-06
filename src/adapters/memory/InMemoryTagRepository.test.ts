import { tagRepositoryContract } from '../tagRepository.contract'
import { createInMemoryTagRepository } from './InMemoryTagRepository'

tagRepositoryContract('InMemoryTagRepository', createInMemoryTagRepository)
