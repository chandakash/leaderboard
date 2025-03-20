import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    createUser(createUserDto: CreateUserDto): Promise<any>;
    getAllUsers(): Promise<any>;
    getUserById(id: number): Promise<any>;
}
