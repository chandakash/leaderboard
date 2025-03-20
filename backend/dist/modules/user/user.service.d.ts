import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
export declare class UserService {
    private userRepository;
    private readonly logger;
    constructor(userRepository: Repository<User>);
    createUser(username: string): Promise<User>;
    getUserById(id: number): Promise<User>;
    getAllUsers(): Promise<User[]>;
}
